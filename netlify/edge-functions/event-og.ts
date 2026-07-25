// Per-event social preview tags for facemeet.app/events/<slug> (build 227).
// A pasted event link unfurls with the event title, host, and start time in
// WhatsApp, LinkedIn, iMessage and X instead of the generic site card.
const SUPABASE_URL = "https://vbaiivsvjdntzaffboue.supabase.co";
const ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZiYWlpdnN2amRudHphZmZib3VlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxODk2NjQsImV4cCI6MjA5MTc2NTY2NH0.ZNzIdnuQXf69nLmo7FafLASNOG6_2m36JZQKCIQzK-w"; // public anon key

export default async (request: Request, context: any) => {
  const response = await context.next();
  try {
    const url = new URL(request.url);
    const slug = url.pathname.replace(/^\/events\//, "").replace(/\/$/, "");
    if (!slug || !/^[a-z0-9-]+$/i.test(slug)) return response;

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) return response;

    const rpc = await fetch(
      `${SUPABASE_URL}/rest/v1/rpc/get_scheduled_conversation`,
      {
        method: "POST",
        headers: { apikey: ANON, "Content-Type": "application/json" },
        body: JSON.stringify({ p_slug: slug, p_ref: null }),
      },
    );
    if (!rpc.ok) return response;
    const data = await rpc.json();
    const e = Array.isArray(data) ? data[0] : data;
    if (!e || !e.title) return response;

    const eventTitle = String(e.title).slice(0, 70);
    const host = String(
      e.host?.name || e.host_name || "a FaceMeet member",
    ).slice(0, 40);
    const isPitch = String(e.event_kind || "") === "pitch_room";
    const starts = e.starts_at ? new Date(String(e.starts_at)) : null;
    const when = starts && !isNaN(starts.getTime())
      ? starts.toLocaleString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
          timeZone: "America/Chicago",
          timeZoneName: "short",
        })
      : "";

    const title = isPitch
      ? `Pitch Room: ${eventTitle}`
      : `${eventTitle} · Live on FaceMeet`;
    const desc = when
      ? `Hosted by ${host} · ${when}. Join live on FaceMeet, the startup network where trust is built face to face.`
      : `Hosted by ${host}. Join live on FaceMeet, the startup network where trust is built face to face.`;
    // Best image wins: a pre-generated 1200x630 card (LinkedIn renders
    // the large card only at that size), else the host's face, else logo.
    let image = String(
      e.host?.thumbnail_url || "https://facemeet.app/brand/facemeet-logo.png",
    );
    let bigCard = false;
    try {
      const cardUrl = `${url.origin}/og/events/${slug}.png`;
      const head = await fetch(cardUrl, { method: "HEAD" });
      if (head.ok) {
        image = cardUrl;
        bigCard = true;
      }
    } catch (_) { /* fall through to thumbnail */ }

    let html = await response.text();
    html = html
      .replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`)
      .replace(/<meta property="og:title" content="[^"]*"/, `<meta property="og:title" content="${title}"`)
      .replace(/<meta property="og:image" content="[^"]*"/, `<meta property="og:image" content="${image}"`)
      .replace(/<meta property="og:description" content="[^"]*"/, `<meta property="og:description" content="${desc}"`)
      .replace(/<meta name="description" content="[^"]*"/, `<meta name="description" content="${desc}"`);
    if (bigCard) {
      html = html.replace(
        "</head>",
        `<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"></head>`,
      );
    }
    if (!html.includes('name="twitter:card"')) {
      html = html.replace(
        "</head>",
        `<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${title}"><meta name="twitter:image" content="${image}"></head>`,
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
