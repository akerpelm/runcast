import { defineMiddleware } from "astro:middleware";

const CANONICAL_HOST = "shouldirun.today";

export const onRequest = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url);

  // Redirect www → non-www (301 permanent)
  if (url.hostname === `www.${CANONICAL_HOST}`) {
    url.hostname = CANONICAL_HOST;
    return Response.redirect(url.toString(), 301);
  }

  const response = await next();
  const ct = response.headers.get("content-type") || "";

  if (ct.includes("text/html")) {
    // Browsers must revalidate HTML on every visit so they never
    // reference stale hashed asset URLs after a deploy.
    response.headers.set("Cache-Control", "no-cache");
  }

  return response;
});
