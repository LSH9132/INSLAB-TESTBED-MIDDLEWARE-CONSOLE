'use client';
import { use } from 'react';
import { XTerminal } from '@/components/terminal/XTerminal';

export default function TerminalPage({ params }: { params: Promise<{ piId: string }> }) {
  const { piId } = use(params);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Terminal</h2>
      <div className="bg-black rounded-lg overflow-hidden border border-gray-800">
        <XTerminal piId={piId} />
      </div>
    </div>
  );
}
