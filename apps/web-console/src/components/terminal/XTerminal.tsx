'use client';
import { useRef, useEffect, useState } from 'react';
import { useTerminal } from '@/hooks/useTerminal';

export function XTerminal({ piId }: { piId: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isClient, setIsClient] = useState(false);
  const { status } = useTerminal(containerRef, piId);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className="relative w-full h-full min-h-[500px] bg-[#0a0a0a]">
        <div ref={containerRef} className="w-full h-full" />
      </div>
    );
  }

  return (
    <div className="relative w-full h-full min-h-[500px] bg-[#0a0a0a]">
      <div ref={containerRef} className="w-full h-full" />

      {status === 'connecting' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
          <div className="text-white text-sm font-medium">연결 중...</div>
        </div>
      )}

      {status === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
          <div className="text-red-500 text-sm font-medium">연결 오류 발생</div>
        </div>
      )}

      {status === 'disconnected' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
          <div className="text-yellow-500 text-sm font-medium">연결 끊김</div>
        </div>
      )}
    </div>
  );
}
