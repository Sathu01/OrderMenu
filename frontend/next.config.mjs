/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["172.25.36.193"],
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
