/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next 16 dropped the `eslint` config key — `next lint` is gone.
  // Run lint separately (or skip during build like before) — no flag
  // needed here.
  typescript: { ignoreBuildErrors: true },
  images: { unoptimized: true },
  // Apple Universal Links: the apple-app-site-association file MUST be
  // served as application/json (not text/plain or octet-stream). Apple
  // is mostly lenient but some validators fail on the wrong content
  // type. The file lives at public/.well-known/apple-app-site-association
  // with no extension; this header config makes Next serve it correctly.
  async headers() {
    return [
      {
        source: '/.well-known/apple-app-site-association',
        headers: [
          { key: 'Content-Type', value: 'application/json' },
          { key: 'Cache-Control', value: 'public, max-age=3600' },
        ],
      },
    ]
  },
}
module.exports = nextConfig
