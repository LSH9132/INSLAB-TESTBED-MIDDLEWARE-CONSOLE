/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async rewrites() {
    const centralUrl = process.env.CENTRAL_SERVER_URL || 'http://central-server:3001';
    return [
      { source: '/api/:path*', destination: `${centralUrl}/api/:path*` },
    ];
  },
};

export default nextConfig;
