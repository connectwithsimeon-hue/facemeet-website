// Tightened-video preview pages (/t/<token>) — proxies to the
// video_tighten Supabase edge function. Same rationale as intro-watch.ts:
// the Supabase gateway force-downgrades HTML GETs to text/plain + nosniff,
// so this proxy asserts the real content type; POST bodies (the
// approve/keep forms) are forwarded intact.
export default async (request: Request) => {
  const url = new URL(request.url);
  const token = url.pathname.split("/").filter(Boolean).pop() ?? "";
  const target = new URL(
    `https://vbaiivsvjdntzaffboue.supabase.co/functions/v1/video_tighten/${token}`,
  );
  url.searchParams.forEach((v, k) => target.searchParams.set(k, v));
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
  const loc = origin.headers.get("location");
  if (loc) {
    headers.set("location", loc);
  } else {
    headers.set("content-type", "text/html; charset=utf-8");
  }
  headers.set("cache-control", "no-store");
  return new Response(origin.body, { status: origin.status, headers });
};

export const config = { path: "/t/*" };
