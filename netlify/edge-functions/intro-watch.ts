// Yara introduction watch pages (/i/<token>) — proxies to the yara_intro
// Supabase edge function. A plain [[redirects]] proxy loses the origin's
// Content-Type (Netlify serves it as text/plain + nosniff, so browsers
// show raw HTML source); this edge function forwards the response with
// its real headers intact, including the 302 for the Say-hello action.
export default async (request: Request) => {
  const url = new URL(request.url);
  const token = url.pathname.split("/").filter(Boolean).pop() ?? "";
  const target = new URL(
    `https://vbaiivsvjdntzaffboue.supabase.co/functions/v1/yara_intro/${token}`,
  );
  url.searchParams.forEach((v, k) => target.searchParams.set(k, v));
  // Forward POST bodies (form actions + RFC 8058 one-click unsubscribe).
  const body = request.method === "POST"
    ? await request.arrayBuffer()
    : undefined;
  const origin = await fetch(target.toString(), {
    method: request.method,
    redirect: "manual",
    headers: {
      "Accept": "text/html,*/*",
      "Content-Type": request.headers.get("content-type") ??
        "application/x-www-form-urlencoded",
    },
    body,
  });
  const headers = new Headers();
  // The Supabase gateway force-downgrades HTML GET responses to
  // text/plain + nosniff on the functions domain; every non-redirect
  // response on this path is our own generated page, so assert the type.
  const loc = origin.headers.get("location");
  if (loc) {
    headers.set("location", loc);
  } else {
    headers.set("content-type", "text/html; charset=utf-8");
  }
  headers.set("cache-control", "no-store");
  return new Response(origin.body, { status: origin.status, headers });
};

export const config = { path: "/i/*" };
