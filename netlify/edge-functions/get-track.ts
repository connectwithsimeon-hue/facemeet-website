// Server-side arrival log for /get — our own ground truth on paid traffic.
//
// Why this exists: the client-side tracker stopped writing on 2026-07-26, so
// when TikTok reported 6,460 clicks and Meta 290 landing-page views on
// 2026-08-26/27, nothing on our side could confirm or deny it. Signups stayed
// flat at the organic baseline, which means the platforms' numbers were the
// only numbers — and they are the seller's numbers.
//
// This logs BEFORE the page renders, so it counts arrivals that ad-blockers,
// no-JS clients and instant back-taps all hide from any pixel. It then hands
// off to the real get.html via context.next() — the page and its redirect are
// untouched. Logging failures are swallowed: /get must never break.
const BOT = /bot|crawl|spider|slurp|preview|headless|monitor|curl|wget|python-requests|facebookexternalhit|whatsapp|telegram|bingpreview|lighthouse|pingdom|uptime/i;

async function visitorHash(ip: string, ua: string): Promise<string> {
  // Pseudonymous id so we can count unique arrivals and spot one IP clicking
  // 400 times. The raw IP is never stored.
  const data = new TextEncoder().encode(`fm-ad-visit|${ip}|${ua}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest).slice(0, 16))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export default async (request: Request, context: any) => {
  try {
    const url = new URL(request.url);
    const q = url.searchParams;
    const ua = request.headers.get("user-agent") ?? "";
    const ios = /iPhone|iPad|iPod/i.test(ua);
    const android = /Android/i.test(ua);
    const ip = context?.ip ??
      request.headers.get("x-nf-client-connection-ip") ?? "";

    const row = {
      path: url.pathname,
      utm_source: q.get("utm_source"),
      utm_medium: q.get("utm_medium"),
      utm_campaign: q.get("utm_campaign"),
      utm_content: q.get("utm_content"),
      ref: q.get("ref"),
      referrer: request.headers.get("referer") ?? "",
      country: context?.geo?.country?.code ?? null,
      city: context?.geo?.city ?? null,
      device: ios ? "ios" : android ? "android" : "desktop",
      dest: ios
        ? "app_store"
        : android
        ? "play"
        : "web",
      bot: BOT.test(ua),
      ua: ua.slice(0, 500),
      visitor: await visitorHash(ip, ua),
    };

    const base = (Deno.env.get("SUPABASE_PROJECT_URL") ??
      "https://vbaiivsvjdntzaffboue.supabase.co").replace(/\/+$/, "");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (key) {
      // Bounded: a slow write must not delay the visitor's redirect.
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 900);
      await fetch(`${base}/rest/v1/ad_visits`, {
        method: "POST",
        signal: ctl.signal,
        headers: {
          "apikey": key,
          "Authorization": `Bearer ${key}`,
          "Content-Type": "application/json",
          "Prefer": "return=minimal",
        },
        body: JSON.stringify(row),
      }).catch(() => {});
      clearTimeout(timer);
    }
  } catch (_e) {
    // Never let measurement break the funnel.
  }
  return context.next();
};
