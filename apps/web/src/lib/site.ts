/**
 * The deployment's own origin, in one place. Used by `metadataBase`, the sitemap, robots
 * and the JSON-LD, all of which need absolute URLs.
 *
 * `NEXT_PUBLIC_SITE_URL` in production; the Vercel-provided production host when a build
 * has one; localhost otherwise, so a dev build still produces parseable absolute URLs
 * instead of throwing inside `new URL()`.
 */
export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'http://localhost:3000')
