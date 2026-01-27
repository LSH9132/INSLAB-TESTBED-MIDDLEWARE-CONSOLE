import { getAllPis } from './pi-registry.service.js';
import type { RingTopology } from '@inslab/shared';

export function getRingTopology(): RingTopology {
  const nodes = getAllPis();
  const edges = nodes.map((node, i) => ({
    from: node.id,
    to: nodes[(i + 1) % nodes.length].id,
  }));
  return { nodes, edges };
}
