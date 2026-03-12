import Link from 'next/link';
import dynamic from 'next/dynamic';

// TerminalClient는 클라이언트 컴포넌트이므로 dynamic import로 SSR 완전 방지
const TerminalClient = dynamic(() => import('@/components/terminal/TerminalClient'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center dark:text-gray-400">
      로딩 중...
    </div>
  ),
});

export default function TerminalPage({ params }: { params: { piId: string } }) {
  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-[#E5E8EB] dark:border-gray-700 px-6 py-4 flex items-center justify-between transition-colors duration-200">
        <div className="flex items-center gap-4">
          <Link
            href="/pis"
            className="text-[#4E5968] dark:text-gray-400 hover:text-[#191F28] dark:hover:text-gray-200 transition-colors font-medium text-[14px]"
          >
            ← 목록으로
          </Link>
          <div className="h-4 w-[1px] bg-[#E5E8EB] dark:bg-gray-700" />
          <h1 className="text-[18px] font-bold text-[#191F28] dark:text-gray-100">
            터미널 <span className="text-[#8B95A1] dark:text-gray-500 font-normal text-[14px] ml-2">ID: {params.piId}</span>
          </h1>
        </div>
      </header>

      {/* Terminal Content */}
      <div className="flex-1 p-6 overflow-hidden">
        <div className="w-full h-full bg-[#0a0a0a] rounded-xl overflow-hidden shadow-lg border border-[#333]">
          <TerminalClient piId={params.piId} />
        </div>
      </div>
    </div>
  );
}
