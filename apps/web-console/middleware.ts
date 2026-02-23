import { NextRequest, NextResponse } from 'next/server';

// API 프록시 - /api/*를 central server로 프록시
export function middleware(req: NextRequest) {
  const url = req.url;

  // API 프록시
  if (url.includes('/api/')) {
    const centralUrl = process.env.CENTRAL_SERVER_URL || 'http://localhost:3001';
    const target = new URL(centralUrl);
    target.pathname = req.nextUrl.pathname;
    target.search = req.nextUrl.search;

    return NextResponse.redirect(target);
  }

  return NextResponse.next();
}

// WebSocket 프록시는 Next.js가 자동으로 처리하지 않음
// 대신 custom server를 사용하거나, WebSocket을 central server로 직접 연결

export const config = {
  matcher: ['/api/:path*', '/ws/:path*'],
};
