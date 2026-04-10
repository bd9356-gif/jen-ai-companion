/** @type {import('next').NextConfig} */
const nextConfig = {
      eslint: {
              ignoreDuringBuilds: true,
      },
      images: {
              unoptimized: true,
      },
      experimental: {
              missingSuspenseWithCSRBailout: false,
      },
}

module.exports = nextConfig
