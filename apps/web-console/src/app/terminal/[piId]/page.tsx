'use client';
import { use } from 'react';
import Link from 'next/link';
import { XTerminal } from '@/components/terminal/XTerminal';

export default function TerminalPage({ params }: { params: Promise<{ piId: string }> }) {
  const { piId } = use(params);

  return (
    <div className="flex flex-col h-screen bg-[#F2F4F6]">
      {/* Header */}
      <header className="bg-white border-b border-[#E5E8EB] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/pis"
            className="text-[#4E5968] hover:text-[#191F28] transition-colors font-medium text-[14px]"
          >
            ← 목록으로
          </Link>
          <div className="h-4 w-[1px] bg-[#E5E8EB]" />
          <h1 className="text-[18px] font-bold text-[#191F28]">
            터미널 <span className="text-[#8B95A1] font-normal text-[14px] ml-2">ID: {piId}</span>
          </h1>
        </div>
      </header>

      {/* Terminal Content */}
      <div className="flex-1 p-6 overflow-hidden">
        <div className="w-full h-full bg-[#0a0a0a] rounded-xl overflow-hidden shadow-lg border border-[#333]">
          <XTerminal piId={piId} />
        </div>
      </div>
    </div>
  );
}
