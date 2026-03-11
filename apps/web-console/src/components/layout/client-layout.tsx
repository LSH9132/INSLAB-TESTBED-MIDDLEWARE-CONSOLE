'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { LogOut } from 'lucide-react';
import { logout } from '@/app/actions/auth';
import { useRouter } from 'next/navigation';

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  
  // 로그인 페이지에서는 네비게이션 바를 숨김
  const isLoginPage = pathname === '/login';

  const handleLogout = async () => {
    await logout();
    router.push('/login');
    router.refresh();
  };

  if (isLoginPage) {
    return <main>{children}</main>;
  }

  return (
    <>
      <nav className="bg-white dark:bg-gray-900 border-b border-[#E5E8EB] dark:border-gray-800 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <Link href="/">
                <h1 className="text-xl font-bold text-[#191F28] dark:text-white">INSLAB Testbed</h1>
              </Link>
              <div className="flex items-center gap-6">
                <Link
                  href="/"
                  className={`text-[15px] font-medium transition-colors ${
                    pathname === '/' 
                      ? 'text-blue-600 dark:text-blue-400' 
                      : 'text-[#4E5968] dark:text-gray-400 hover:text-[#191F28] dark:hover:text-gray-200'
                  }`}
                >
                  대시보드
                </Link>
                <Link
                  href="/pis"
                  className={`text-[15px] font-medium transition-colors ${
                    pathname.startsWith('/pis')
                      ? 'text-blue-600 dark:text-blue-400' 
                      : 'text-[#4E5968] dark:text-gray-400 hover:text-[#191F28] dark:hover:text-gray-200'
                  }`}
                >
                  Pi 관리
                </Link>
                <Link
                  href="/network"
                  className={`text-[15px] font-medium transition-colors ${
                    pathname.startsWith('/network')
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-[#4E5968] dark:text-gray-400 hover:text-[#191F28] dark:hover:text-gray-200'
                  }`}
                >
                  네트워크
                </Link>
                <Link
                  href="/topology"
                  className={`text-[15px] font-medium transition-colors ${
                    pathname.startsWith('/topology')
                      ? 'text-blue-600 dark:text-blue-400' 
                      : 'text-[#4E5968] dark:text-gray-400 hover:text-[#191F28] dark:hover:text-gray-200'
                  }`}
                >
                  토폴로지
                </Link>
                <Link
                  href="/logs"
                  className={`text-[15px] font-medium transition-colors ${
                    pathname.startsWith('/logs')
                      ? 'text-blue-600 dark:text-blue-400' 
                      : 'text-[#4E5968] dark:text-gray-400 hover:text-[#191F28] dark:hover:text-gray-200'
                  }`}
                >
                  로그
                </Link>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <button 
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-red-600 dark:text-gray-300 dark:hover:text-red-400 bg-gray-100 hover:bg-red-50 dark:bg-gray-800 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                title="로그아웃"
              >
                <LogOut size={16} />
                <span className="hidden sm:inline">로그아웃</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* 메인 콘텐츠 */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {children}
      </main>
    </>
  );
}
