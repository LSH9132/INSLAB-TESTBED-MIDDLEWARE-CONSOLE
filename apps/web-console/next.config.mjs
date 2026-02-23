/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(process.env.NODE_ENV === 'production' ? { output: 'standalone' } : {}),
  async rewrites() {
    const centralUrl = process.env.CENTRAL_SERVER_URL || 'http://localhost:3001';
    return [
      { source: '/api/:path*', destination: `${centralUrl}/api/:path*` },
    ];
  },
};

export default nextConfig;
