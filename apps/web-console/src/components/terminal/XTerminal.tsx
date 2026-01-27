'use client';
import { useRef } from 'react';
import { useTerminal } from '@/hooks/useTerminal';

export function XTerminal({ piId }: { piId: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  useTerminal(containerRef, piId);

  return <div ref={containerRef} className="w-full h-full min-h-[500px]" />;
}
