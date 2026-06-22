/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },  // ← RIGHT HERE
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.cloudflarestream.com' },
    ],
  },
};
export default nextConfig;