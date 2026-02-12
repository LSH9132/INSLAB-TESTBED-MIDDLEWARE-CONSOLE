import { ThemeToggle } from '@/components/ui/theme-toggle';
import { ThemeProvider } from '@/components/providers/theme-provider';
import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'INSLAB Testbed Console',
  description: 'Raspberry Pi testbed management console',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="bg-[#F9FAFB] dark:bg-gray-950 text-[#191F28] dark:text-gray-100 min-h-screen transition-colors duration-300">
        <ThemeProvider>
          {/* Toss 스타일 네비게이션 */}
          <nav className="bg-white dark:bg-gray-900 border-b border-[#E5E8EB] dark:border-gray-800 transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-8">
                  <h1 className="text-xl font-bold text-[#191F28] dark:text-white">INSLAB Testbed</h1>
                  <div className="flex items-center gap-6">
                    <Link
                      href="/"
                      className="text-[#4E5968] dark:text-gray-400 hover:text-[#191F28] dark:hover:text-gray-200 text-[15px] font-medium transition-colors"
                    >
                      대시보드
                    </Link>
                    <Link
                      href="/pis"
                      className="text-[#4E5968] dark:text-gray-400 hover:text-[#191F28] dark:hover:text-gray-200 text-[15px] font-medium transition-colors"
                    >
                      Pi 관리
                    </Link>
                    <Link
                      href="/topology"
                      className="text-[#4E5968] dark:text-gray-400 hover:text-[#191F28] dark:hover:text-gray-200 text-[15px] font-medium transition-colors"
                    >
                      토폴로지
                    </Link>
                    <Link
                      href="/logs"
                      className="text-[#4E5968] dark:text-gray-400 hover:text-[#191F28] dark:hover:text-gray-200 text-[15px] font-medium transition-colors"
                    >
                      로그
                    </Link>
                  </div>
                  <ThemeToggle />
                </div>

                {/* Theme Toggle will be added here or in a header component */}
                {/* For now just placeholder or we can add it directly if we import it */}
              </div>
            </div>
          </nav>

          {/* 메인 콘텐츠 */}
          <main className="max-w-7xl mx-auto px-6 py-8">
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
