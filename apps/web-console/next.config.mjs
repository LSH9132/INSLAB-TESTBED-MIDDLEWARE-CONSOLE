/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(process.env.NODE_ENV === 'production' ? { output: 'standalone' } : {}),
  async rewrites() {
    const centralUrl =
      process.env.CENTRAL_SERVER_URL ||
      process.env.NEXT_PUBLIC_CENTRAL_SERVER_URL ||
      'http://localhost:3101';
    return [
      { source: '/api/:path*', destination: `${centralUrl}/api/:path*` },
    ];
  },
};

export default nextConfig;
