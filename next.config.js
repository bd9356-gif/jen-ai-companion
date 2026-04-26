/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next 16 dropped the `eslint` config key — `next lint` is gone.
  // Run lint separately (or skip during build like before) — no flag
  // needed here.
  typescript: { ignoreBuildErrors: true },
  images: { unoptimized: true },
}
module.exports = nextConfig
