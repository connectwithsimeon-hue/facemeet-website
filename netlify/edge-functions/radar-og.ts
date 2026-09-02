// Per-item social preview tags for facemeet.app/radar/<slug> (release
// 255). Pasted Radar links unfurl with the item's title, lane, deadline,
// and amount instead of the generic site card.
const SUPABASE_URL = "https://vbaiivsvjdntzaffboue.supabase.co";
const ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZiYWlpdnN2amRudHphZmZib3VlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxODk2NjQsImV4cCI6MjA5MTc2NTY2NH0.ZNzIdnuQXf69nLmo7FafLASNOG6_2m36JZQKCIQzK-w";

const LANE_LABELS: Record<string, string> = {
  ai_news: "AI News",
  grants: "Grant",
  accelerators: "Accelerator",
  investors: "Investors",
  events: "Event",
  talks: "Talk",
};

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
    const slug = url.pathname.replace(/^\/radar\//, "").replace(/\/$/, "");
    if (!slug || !/^[a-z0-9-]+$/i.test(slug)) return response;

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) return response;

    const rpc = await fetch(
      `${SUPABASE_URL}/rest/v1/rpc/get_public_radar_item`,
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

    const lane = LANE_LABELS[String(r.lane)] || "Radar";
    const title = `${String(r.title).slice(0, 90)} · FaceMeet Radar`;
    const bits: string[] = [];
    if (r.amount) bits.push(String(r.amount));
    if (r.deadline_at) {
      const days = Math.floor(
        (new Date(String(r.deadline_at)).getTime() - Date.now()) / 86400000,
      );
      if (days >= 0) {
        bits.push(days === 0 ? "closes today" : `closes in ${days} days`);
      }
    }
    const desc =
      `${lane}${bits.length ? " — " + bits.join(", ") : ""}. ` +
      `Verified on FaceMeet Radar: grants, accelerators, investors, and ` +
      `AI news for founders — with the members going after each one.`;
    const image = String(r.image_url || "").startsWith("https://")
      ? String(r.image_url)
      : "https://facemeet.app/assets/brand/facemeet-og-radar.png";

    let html = await response.text();
    const tags = [
      `<meta property="og:title" content="${escapeAttr(title)}">`,
      `<meta property="og:description" content="${escapeAttr(desc)}">`,
      `<meta property="og:type" content="article">`,
      `<meta property="og:url" content="https://facemeet.app/radar/${escapeAttr(slug)}">`,
      `<meta property="og:image" content="${escapeAttr(image)}">`,
      `<meta name="twitter:card" content="summary_large_image">`,
      `<meta name="twitter:title" content="${escapeAttr(title)}">`,
      `<meta name="twitter:description" content="${escapeAttr(desc)}">`,
      `<meta name="twitter:image" content="${escapeAttr(image)}">`,
    ].join("\n");

    html = html
      .replace(/<meta property="og:[^"]*"[^>]*>\n?/g, "")
      .replace(/<meta name="twitter:[^"]*"[^>]*>\n?/g, "")
      .replace("</title>", `</title>\n${tags}`);
    const headers = new Headers(response.headers);
    headers.delete("content-length");
    return new Response(html, { status: response.status, headers });
  } catch (_) {
    return response;
  }
};
