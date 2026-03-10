import { ThemeProvider } from '@/components/providers/theme-provider';
import type { Metadata } from 'next';
import { ClientLayout } from '@/components/layout/client-layout';
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
          <ClientLayout>
            {children}
          </ClientLayout>
        </ThemeProvider>
      </body>
    </html>
  );
}
