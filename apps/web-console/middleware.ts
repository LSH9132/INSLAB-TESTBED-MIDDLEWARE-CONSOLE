import { NextRequest, NextResponse } from 'next/server';

const AUTH_COOKIE_NAME = 'auth_token';

// API 프록시 및 인증 미들웨어
export function middleware(req: NextRequest) {
  const url = req.url;
  const path = req.nextUrl.pathname;

  // 인증이 필요 없는 경로
  const isPublicPath = path === '/login' || path.startsWith('/_next/') || path.includes('.');

  // 인증 토큰 확인
  const isAuthenticated = req.cookies.has(AUTH_COOKIE_NAME);

  // 1. 로그인 되어있는데 로그인 페이지 접근 시 대시보드로 리다이렉트
  if (path === '/login' && isAuthenticated) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  // 2. 인증되지 않은 상태에서 보호된 경로 접근 시 리다이렉트 (API는 401 반환)
  if (!isPublicPath && !isAuthenticated) {
    if (path.startsWith('/api/')) {
      return new NextResponse(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'content-type': 'application/json' } }
      );
    }
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // 3. API 프록시 (인증된 요청만 통과됨)
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
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
