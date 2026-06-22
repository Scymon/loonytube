/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,   // ← this is what Vercel needs
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.cloudflarestream.com' },
    ],
  },
};
export default nextConfig;