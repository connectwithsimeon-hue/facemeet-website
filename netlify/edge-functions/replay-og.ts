// Per-replay social preview tags for facemeet.app/replay/<slug>
// (Release A). Replay links previously carried NO server-side OG tags —
// every pasted replay unfurled as the generic site card. Now they show
// the conversation title, host, duration, and the host's face.
const SUPABASE_URL = "https://vbaiivsvjdntzaffboue.supabase.co";
const ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZiYWlpdnN2amRudHphZmZib3VlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxODk2NjQsImV4cCI6MjA5MTc2NTY2NH0.ZNzIdnuQXf69nLmo7FafLASNOG6_2m36JZQKCIQzK-w";

const escapeAttr = (v: string) =>
  v.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

// A slug that does not resolve must answer 404, not 200 with the page shell.
// Serving the shell at 200 turns every invented URL into an indexable page, which
// is how a small site collects thin-content penalties instead of traffic. The body
// is kept so a person still sees the page's own "unavailable" state; only the status
// code and the robots tag change, which is what crawlers read.
async function notFound(response: Response): Promise<Response> {
  const body = await response.text();
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  return new Response(
    body.replace(/<head>/i, '<head>\n<meta name="robots" content="noindex">'),
    { status: 404, headers },
  );
}

export default async (request: Request, context: any) => {
  const response = await context.next();
  try {
    const url = new URL(request.url);
    const slug = url.pathname.replace(/^\/replay\//, "").replace(/\/$/, "");
    if (!slug || !/^[a-z0-9-]+$/i.test(slug)) return response;

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) return response;

    const rpc = await fetch(
      `${SUPABASE_URL}/rest/v1/rpc/get_public_replay_by_slug`,
      {
        method: "POST",
        headers: { apikey: ANON, "Content-Type": "application/json" },
        body: JSON.stringify({ p_slug: slug }),
      },
    );
    if (!rpc.ok) return response;
    const data = await rpc.json();
    const r = Array.isArray(data) ? data[0] : data;
    if (!r || !r.title) return await notFound(response);

    const replayTitle = String(r.title).slice(0, 70);
    const host = String(r.host_name || "a FaceMeet member").slice(0, 40);
    const speakers = Array.isArray(r.speakers)
      ? r.speakers.map((s: any) => String(s?.name || "").trim()).filter(Boolean)
      : [];
    const people = [host, ...speakers].slice(0, 3).join(" & ");
    const mins = Math.max(1, Math.round(Number(r.duration_seconds || 0) / 60));
    const title = `${replayTitle} · Replay on FaceMeet`;
    const desc =
      `${people} in conversation — ${mins} min. Watch the replay on ` +
      `FaceMeet, the startup network where trust is built face to face.`;
    const image = String(r.host_photo_url || "").startsWith("https://")
      ? String(r.host_photo_url)
      : "https://facemeet.app/assets/brand/facemeet-og-conversation.png";

    let html = await response.text();
    const tags = [
      `<meta property="og:title" content="${escapeAttr(title)}">`,
      `<meta property="og:description" content="${escapeAttr(desc)}">`,
      `<meta property="og:type" content="video.other">`,
      `<meta property="og:url" content="https://facemeet.app/replay/${escapeAttr(slug)}">`,
      `<meta property="og:image" content="${escapeAttr(image)}">`,
      `<meta name="twitter:card" content="summary_large_image">`,
      `<meta name="twitter:title" content="${escapeAttr(title)}">`,
      `<meta name="twitter:description" content="${escapeAttr(desc)}">`,
      `<meta name="twitter:image" content="${escapeAttr(image)}">`,
    ].join("\n");

    // Strip the page's generic OG/twitter tags, then inject ours.
    html = html.replace(
      /<meta (?:property="og:|name="twitter:)[^>]*>\s*/g,
      "",
    );
    html = html.replace(/<\/title>/i, `</title>\n${tags}`);
    html = html.replace(
      /<title>[^<]*<\/title>/i,
      `<title>${escapeAttr(title)}</title>`,
    );

    return new Response(html, {
      status: response.status,
      headers: response.headers,
    });
  } catch {
    return response;
  }
};
