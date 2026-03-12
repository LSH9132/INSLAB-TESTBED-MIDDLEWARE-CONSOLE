import { NextRequest, NextResponse } from 'next/server';

const AUTH_COOKIE_NAME = 'auth_token';

// API 프록시 및 인증 미들웨어
export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  console.log('[MIDDLEWARE] Executing for path:', path);

  // 인증이 필요 없는 경로
  const isPublicPath =
    path === '/login' ||
    path.startsWith('/_next/') ||
    path.startsWith('/favicon');

  // 인증 토큰 확인
  const authCookie = req.cookies.get(AUTH_COOKIE_NAME);
  const isAuthenticated = authCookie?.value === 'authenticated';

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
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('from', path);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

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
