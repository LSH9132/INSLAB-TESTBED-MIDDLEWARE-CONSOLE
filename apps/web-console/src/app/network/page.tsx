'use client';

import { NetworkAnalyticsView } from '@/components/network/NetworkAnalyticsView';
import { usePiStatus } from '@/hooks/usePiStatus';

export default function NetworkPage() {
  const pis = usePiStatus();

  return <NetworkAnalyticsView pis={pis} />;
}
