import { defineMiddleware } from "astro:middleware";

export const onRequest = defineMiddleware(async (_context, next) => {
  const response = await next();
  const ct = response.headers.get("content-type") || "";

  if (ct.includes("text/html")) {
    // Browsers must revalidate HTML on every visit so they never
    // reference stale hashed asset URLs after a deploy.
    response.headers.set("Cache-Control", "no-cache");
  }

  return response;
});
