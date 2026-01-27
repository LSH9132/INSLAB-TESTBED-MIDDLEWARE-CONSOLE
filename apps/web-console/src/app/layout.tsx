import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'INSLAB Testbed Console',
  description: 'Raspberry Pi testbed management console',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="bg-gray-950 text-gray-100 min-h-screen">
        <nav className="bg-gray-900 border-b border-gray-800 px-6 py-3 flex items-center gap-8">
          <h1 className="text-lg font-bold">INSLAB Testbed</h1>
          <Link href="/" className="text-gray-400 hover:text-white text-sm">Dashboard</Link>
          <Link href="/pis" className="text-gray-400 hover:text-white text-sm">Pi Management</Link>
          <Link href="/topology" className="text-gray-400 hover:text-white text-sm">Topology</Link>
          <Link href="/logs" className="text-gray-400 hover:text-white text-sm">Logs</Link>
        </nav>
        <main className="p-6">{children}</main>
      </body>
    </html>
  );
}
