'use client';
import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { RingTopology } from '@inslab/shared';

export function RingGraph({ topology }: { topology: RingTopology }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || topology.nodes.length === 0) return;

    const width = 600;
    const height = 600;
    const radius = 200;
    const cx = width / 2;
    const cy = height / 2;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg.attr('viewBox', `0 0 ${width} ${height}`);

    const nodePositions = topology.nodes.map((node, i) => {
      const angle = (2 * Math.PI * i) / topology.nodes.length - Math.PI / 2;
      return { ...node, x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
    });

    const posMap = new Map(nodePositions.map((n) => [n.id, n]));

    // Draw edges (arrows)
    const defs = svg.append('defs');
    defs.append('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 0 10 10')
      .attr('refX', 28)
      .attr('refY', 5)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M 0 0 L 10 5 L 0 10 z')
      .attr('fill', '#3b82f6');

    svg.selectAll('line')
      .data(topology.edges)
      .join('line')
      .attr('x1', (d) => posMap.get(d.from)!.x)
      .attr('y1', (d) => posMap.get(d.from)!.y)
      .attr('x2', (d) => posMap.get(d.to)!.x)
      .attr('y2', (d) => posMap.get(d.to)!.y)
      .attr('stroke', '#3b82f6')
      .attr('stroke-width', 2)
      .attr('marker-end', 'url(#arrow)');

    // Draw nodes
    const g = svg.selectAll('g.node')
      .data(nodePositions)
      .join('g')
      .attr('class', 'node')
      .attr('transform', (d) => `translate(${d.x},${d.y})`);

    g.append('circle')
      .attr('r', 20)
      .attr('fill', (d) => d.status === 'online' ? '#22c55e' : d.status === 'offline' ? '#ef4444' : '#6b7280');

    g.append('text')
      .text((d) => d.hostname)
      .attr('text-anchor', 'middle')
      .attr('dy', 35)
      .attr('fill', '#d1d5db')
      .attr('font-size', 12);
  }, [topology]);

  return <svg ref={svgRef} className="w-full max-w-[600px] mx-auto" />;
}
