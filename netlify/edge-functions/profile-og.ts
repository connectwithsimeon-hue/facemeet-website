// Per-member social preview tags for facemeet.app/p/<slug>.
// Crawlers (Facebook, WhatsApp, LinkedIn, iMessage) don't run JavaScript,
// so without this every shared profile shows the same generic card.
const SUPABASE_URL = "https://vbaiivsvjdntzaffboue.supabase.co";
const ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZiYWlpdnN2amRudHphZmZib3VlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxODk2NjQsImV4cCI6MjA5MTc2NTY2NH0.ZNzIdnuQXf69nLmo7FafLASNOG6_2m36JZQKCIQzK-w"; // public anon key, injected at deploy

export default async (request: Request, context: any) => {
  const response = await context.next();
  try {
    const url = new URL(request.url);
    const slug = url.pathname.replace(/^\/p\//, "").replace(/\/$/, "");
    if (!slug || !/^[a-z0-9-]+$/i.test(slug)) return response;

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) return response;

    const rpc = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_public_profile_by_slug`, {
      method: "POST",
      headers: { apikey: ANON, "Content-Type": "application/json" },
      body: JSON.stringify({ profile_slug: slug }),
    });
    if (!rpc.ok) return response;
    const rows = await rpc.json();
    const p = Array.isArray(rows) ? rows[0] : rows;
    if (!p || !p.display_name) return response;

    const name = String(p.display_name).slice(0, 60);
    const image = String(p.thumbnail_url || "https://facemeet.app/brand/facemeet-logo.png");
    const title = `${name} on FaceMeet`;
    const desc = `Meet ${name} face to face on FaceMeet, the startup network where trust is built in real conversations.`;

    let html = await response.text();
    html = html
      .replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`)
      .replace(/<meta property="og:title" content="[^"]*"/, `<meta property="og:title" content="${title}"`)
      .replace(/<meta property="og:image" content="[^"]*"/, `<meta property="og:image" content="${image}"`)
      .replace(/<meta property="og:description" content="[^"]*"/, `<meta property="og:description" content="${desc}"`)
      .replace(/<meta name="description" content="[^"]*"/, `<meta name="description" content="${desc}"`);
    if (!html.includes('name="twitter:card"')) {
      html = html.replace("</head>",
        `<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${title}"><meta name="twitter:image" content="${image}"></head>`);
    }
    // Video tags: platforms that support og:video (Facebook, iMessage,
    // Telegram) show a playable preview; the rest fall back to the face
    // thumbnail above. Videos are portrait phone recordings.
    const video = String(p.profile_video_url || "");
    if (video.startsWith("https://")) {
      html = html
        .replace(/<meta property="og:type" content="[^"]*"/, `<meta property="og:type" content="video.other"`)
        .replace("</head>",
          `<meta property="og:video" content="${video}"><meta property="og:video:secure_url" content="${video}"><meta property="og:video:type" content="video/mp4"><meta property="og:video:width" content="720"><meta property="og:video:height" content="1280"></head>`);
    }
    return new Response(html, { status: response.status, headers: response.headers });
  } catch {
    return response;
  }
};
