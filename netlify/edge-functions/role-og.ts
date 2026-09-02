// Per-role social preview tags for facemeet.app/roles/<slug> (build 232).
// A shared role link unfurls with the title, company, and honest salary in
// WhatsApp, LinkedIn, iMessage and X instead of the generic site card.
const SUPABASE_URL = "https://vbaiivsvjdntzaffboue.supabase.co";
const ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZiYWlpdnN2amRudHphZmZib3VlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxODk2NjQsImV4cCI6MjA5MTc2NTY2NH0.ZNzIdnuQXf69nLmo7FafLASNOG6_2m36JZQKCIQzK-w"; // public anon key

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
    const slug = url.pathname.replace(/^\/roles\//, "").replace(/\/$/, "");
    if (!slug || !/^[a-z0-9-]+$/i.test(slug)) return response;

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) return response;

    const rpc = await fetch(
      `${SUPABASE_URL}/rest/v1/rpc/get_public_job_post`,
      {
        method: "POST",
        headers: { apikey: ANON, "Content-Type": "application/json" },
        body: JSON.stringify({ p_slug: slug }),
      },
    );
    if (!rpc.ok) return response;
    const r = await rpc.json();
    if (!r || !r.title) return await notFound(response);

    const roleTitle = String(r.title).slice(0, 70);
    const poster = String(r.poster_name || "A recruiter").slice(0, 40);
    const salary =
      r.salary_not_set || r.salary_min == null || r.salary_max == null
        ? "Salary not disclosed yet"
        : `$${Math.round(r.salary_min / 1000)}k to $${
            Math.round(r.salary_max / 1000)
          }k`;
    const loc = r.location_type
      ? String(r.location_type).charAt(0).toUpperCase() +
        String(r.location_type).slice(1)
      : "";

    const title = `${roleTitle} at ${poster}`;
    const desc =
      `${salary}${loc ? ` · ${loc}` : ""}. Watch the recruiter pitch this ` +
      `role on video. Applying is free on FaceMeet — your video profile is ` +
      `your application.`;
    const image = String(
      r.poster_thumbnail || "https://facemeet.app/assets/brand/facemeet-og-hiring.png",
    );

    let html = await response.text();
    html = html
      .replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`)
      .replace(/<meta property="og:title" content="[^"]*"/, `<meta property="og:title" content="${title}"`)
      .replace(/<meta property="og:image" content="[^"]*"/, `<meta property="og:image" content="${image}"`)
      .replace(/<meta property="og:description" content="[^"]*"/, `<meta property="og:description" content="${desc}"`)
      .replace(/<meta name="description" content="[^"]*"/, `<meta name="description" content="${desc}"`);
    if (!html.includes('name="twitter:card"')) {
      html = html.replace(
        "</head>",
        `<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${title}"><meta name="twitter:image" content="${image}"></head>`,
      );
    }
    // Video tags: platforms that support og:video (Facebook, iMessage,
    // Telegram) show a playable preview; the rest fall back to the
    // recruiter's face thumbnail. Videos are portrait phone recordings.
    const video = String(r.role_video_url || "");
    if (video.startsWith("https://")) {
      html = html
        .replace(/<meta property="og:type" content="[^"]*"/, `<meta property="og:type" content="video.other"`)
        .replace(
          "</head>",
          `<meta property="og:video" content="${video}"><meta property="og:video:secure_url" content="${video}"><meta property="og:video:type" content="video/mp4"><meta property="og:video:width" content="720"><meta property="og:video:height" content="1280"></head>`,
        );
    }
    return new Response(html, {
      status: response.status,
      headers: response.headers,
    });
  } catch {
    return response;
  }
};
