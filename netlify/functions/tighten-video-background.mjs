// Yara Stage 4 render worker (2026-08-24). Runs as a Netlify BACKGROUND
// function (15-minute limit) on the existing plan — no extra vendor.
// Given a video_tighten_jobs id: download the raw take from Supabase
// storage, re-render keeping only the cut-plan segments (CUT-ONLY — the
// plan removed silences and filler words, never reordered), upload the
// tight cut, and report back to the video_tighten edge function which
// emails the member a preview. Errors mark the job failed; the raw video
// stays live and untouched throughout.
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { writeFile, readFile, unlink } from "node:fs/promises";
import { existsSync } from "node:fs";

const run = promisify(execFile);

const SUPABASE_URL = "https://vbaiivsvjdntzaffboue.supabase.co";

function ffmpegPath() {
  const candidates = [
    process.env.LAMBDA_TASK_ROOT
      ? `${process.env.LAMBDA_TASK_ROOT}/node_modules/ffmpeg-static/ffmpeg`
      : null,
    `${process.cwd()}/node_modules/ffmpeg-static/ffmpeg`,
    "/var/task/node_modules/ffmpeg-static/ffmpeg",
  ].filter(Boolean);
  for (const c of candidates) if (existsSync(c)) return c;
  throw new Error("ffmpeg binary not found in bundle");
}

async function pg(path, init = {}) {
  const key = process.env.TIGHTEN_SUPABASE_KEY;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`pg_${res.status}_${await res.text()}`);
  return res.json();
}

async function callback(body) {
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/video_tighten`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-tighten-secret": process.env.TIGHTEN_SECRET,
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    console.log("callback failed", String(e));
  }
}

export default async (request) => {
  if (request.headers.get("x-tighten-secret") !== process.env.TIGHTEN_SECRET) {
    return new Response("unauthorized", { status: 401 });
  }
  const { job_id: jobId } = await request.json().catch(() => ({}));
  if (!jobId) return new Response("job_id required", { status: 400 });

  const inPath = `/tmp/raw_${jobId}.mp4`;
  const outPath = `/tmp/tight_${jobId}.mp4`;
  try {
    const [job] = await pg(
      `video_tighten_jobs?id=eq.${jobId}&select=id,user_id,video_url,cut_plan,raw_ms,status`,
    );
    if (!job) throw new Error("job_not_found");
    if (job.status !== "queued") {
      console.log("job not queued, skipping", jobId, job.status);
      return new Response("skipped", { status: 200 });
    }
    await pg(`video_tighten_jobs?id=eq.${jobId}`, {
      method: "PATCH",
      body: JSON.stringify({
        status: "rendering",
        updated_at: new Date().toISOString(),
      }),
    });

    const videoRes = await fetch(job.video_url);
    if (!videoRes.ok) throw new Error(`video_http_${videoRes.status}`);
    await writeFile(inPath, Buffer.from(await videoRes.arrayBuffer()));

    const keep = (job.cut_plan?.keep || []).filter(
      (seg) => Array.isArray(seg) && seg.length === 2 && seg[1] > seg[0],
    );
    if (keep.length === 0) throw new Error("empty_cut_plan");
    const sec = (ms) => (ms / 1000).toFixed(3);
    const parts = keep.map((seg, i) =>
      `[0:v]trim=start=${sec(seg[0])}:end=${sec(seg[1])},setpts=PTS-STARTPTS[v${i}];` +
      `[0:a]atrim=start=${sec(seg[0])}:end=${sec(seg[1])},asetpts=PTS-STARTPTS[a${i}]`
    );
    const inputs = keep.map((_, i) => `[v${i}][a${i}]`).join("");
    const filter = `${parts.join(";")};${inputs}concat=n=${keep.length}:v=1:a=1[v][a]`;

    const { stderr } = await run(ffmpegPath(), [
      "-y",
      "-i",
      inPath,
      "-filter_complex",
      filter,
      "-map",
      "[v]",
      "-map",
      "[a]",
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "23",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-movflags",
      "+faststart",
      outPath,
    ], { timeout: 12 * 60 * 1000, maxBuffer: 16 * 1024 * 1024 });

    // The container's true duration — the queue-time estimate from word
    // timestamps undercounts trailing silence.
    let rawMsActual = 0;
    const dur = /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(
      String(stderr ?? ""),
    );
    if (dur) {
      rawMsActual = Math.round(
        (Number(dur[1]) * 3600 + Number(dur[2]) * 60 + Number(dur[3])) * 1000,
      );
    }

    const tight = await readFile(outPath);
    const objectPath = `${job.user_id}/tight_${jobId}.mp4`;
    const key = process.env.TIGHTEN_SUPABASE_KEY;
    const upRes = await fetch(
      `${SUPABASE_URL}/storage/v1/object/profile-videos/${objectPath}`,
      {
        method: "POST",
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          "Content-Type": "video/mp4",
          "x-upsert": "true",
        },
        body: tight,
      },
    );
    if (!upRes.ok) throw new Error(`upload_${upRes.status}_${await upRes.text()}`);
    const tightUrl =
      `${SUPABASE_URL}/storage/v1/object/public/profile-videos/${objectPath}`;
    const tightMs = keep.reduce((sum, [s, e]) => sum + (e - s), 0);

    await callback({
      action: "render_done",
      job_id: jobId,
      tight_url: tightUrl,
      tight_ms: tightMs,
      raw_ms_actual: rawMsActual,
    });
    return new Response("ok", { status: 200 });
  } catch (e) {
    console.log("tighten render failed", jobId, String(e));
    await callback({
      action: "render_failed",
      job_id: jobId,
      error: String(e).slice(0, 300),
    });
    return new Response("failed", { status: 200 });
  } finally {
    for (const p of [inPath, outPath]) {
      try {
        await unlink(p);
      } catch {}
    }
  }
};
