'use client';
import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { RingTopology, PiNode } from '@inslab/shared';

interface Node extends d3.SimulationNodeDatum {
  id: string;
  hostname: string;
  status: string;
  ipManagement: string;
  ipRing: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  isCenter?: boolean;
}

export function RingGraph({ topology }: { topology: RingTopology }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredNode, setHoveredNode] = useState<Node | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [showLegend, setShowLegend] = useState(true);

  useEffect(() => {
    if (!svgRef.current || topology.nodes.length === 0) return;

    const width = 1000;
    const height = 900;
    const centerRadius = 80;
    const piRadius = 50;
    const ringRadius = 350;

    // SVG 초기화
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg.attr('viewBox', `0 0 ${width} ${height}`);

    const g = svg.append('g');

    // 줌/팬 설정
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 2])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Central Server 노드
    const centerNode: Node = {
      id: 'central-server',
      hostname: 'Central Server',
      status: 'online',
      ipManagement: 'localhost',
      ipRing: '-',
      x: width / 2,
      y: height / 2,
      fx: width / 2,
      fy: height / 2,
      isCenter: true
    };

    // Pi 노드들 원형 배치
    const piNodes: Node[] = topology.nodes.map((node, i) => {
      const angle = (2 * Math.PI * i) / topology.nodes.length - Math.PI / 2;
      return {
        id: node.id,
        hostname: node.hostname,
        status: node.status,
        ipManagement: node.ipManagement,
        ipRing: node.ipRing,
        x: width / 2 + ringRadius * Math.cos(angle),
        y: height / 2 + ringRadius * Math.sin(angle),
      };
    });

    const allNodes = [centerNode, ...piNodes];

    // 정의: 화살표 마커
    const defs = g.append('defs');

    // 링 연결 화살표 (토스 블루)
    defs.append('marker')
      .attr('id', 'arrow-ring')
      .attr('viewBox', '0 0 10 10')
      .attr('refX', 9)
      .attr('refY', 5)
      .attr('markerWidth', 8)
      .attr('markerHeight', 8)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M 0 0 L 10 5 L 0 10 z')
      .attr('fill', '#3182F6');

    // 관리 연결 화살표 (회색)
    defs.append('marker')
      .attr('id', 'arrow-manage')
      .attr('viewBox', '0 0 10 10')
      .attr('refX', 9)
      .attr('refY', 5)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M 0 0 L 10 5 L 0 10 z')
      .attr('fill', '#B0B8C1');

    // 그라데이션 (데이터 흐름 애니메이션용)
    const gradient = defs.append('linearGradient')
      .attr('id', 'flow-gradient');

    gradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#3182F6')
      .attr('stop-opacity', 1);

    gradient.append('stop')
      .attr('offset', '50%')
      .attr('stop-color', '#60A5FA')
      .attr('stop-opacity', 0.8);

    gradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#3182F6')
      .attr('stop-opacity', 1);

    // 관리 연결선 그룹 (기본 숨김)
    const manageLinksGroup = g.append('g').attr('class', 'manage-links').style('opacity', 0);

    // 링 연결선 그룹
    const ringLinksGroup = g.append('g').attr('class', 'ring-links');

    // 링 경로 계산 함수 (곡선)
    const calculateRingPath = (source: Node, target: Node) => {
      const sx = source.x ?? 0;
      const sy = source.y ?? 0;
      const tx = target.x ?? 0;
      const ty = target.y ?? 0;

      // 중간 제어점 (외부로 휘어지게)
      const mx = (sx + tx) / 2;
      const my = (sy + ty) / 2;
      const centerX = width / 2;
      const centerY = height / 2;
      const dx = mx - centerX;
      const dy = my - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const offset = 80; // 휘어지는 정도
      const cx = mx + (dx / dist) * offset;
      const cy = my + (dy / dist) * offset;

      return `M ${sx} ${sy} Q ${cx} ${cy} ${tx} ${ty}`;
    };

    // 링 연결선 그리기
    topology.edges.forEach((edge) => {
      const source = piNodes.find(n => n.id === edge.from);
      const target = piNodes.find(n => n.id === edge.to);

      if (source && target) {
        const path = ringLinksGroup.append('path')
          .attr('d', calculateRingPath(source, target))
          .attr('stroke', 'url(#flow-gradient)')
          .attr('stroke-width', 5)
          .attr('fill', 'none')
          .attr('marker-end', 'url(#arrow-ring)')
          .attr('opacity', 0.8);

        // 흐름 애니메이션
        path.attr('stroke-dasharray', '10 5')
          .append('animate')
          .attr('attributeName', 'stroke-dashoffset')
          .attr('from', '0')
          .attr('to', '30')
          .attr('dur', '1.5s')
          .attr('repeatCount', 'indefinite');
      }
    });

    // 노드 그룹
    const nodesGroup = g.append('g').attr('class', 'nodes');

    const nodes = nodesGroup.selectAll('g.node')
      .data(allNodes)
      .join('g')
      .attr('class', 'node')
      .attr('transform', (d: Node) => `translate(${d.x ?? 0},${d.y ?? 0})`)
      .attr('cursor', (d: Node) => d.isCenter ? 'default' : 'pointer')
      .call(d3.drag<SVGGElement, Node>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended) as any)
      .on('mouseenter', function (event, d: Node) {
        if (!d.isCenter) {
          setHoveredNode(d);
          // 해당 노드와 Central Server 연결선 표시
          showManagementConnection(d);
          // 노드 강조
          d3.select(this).select('circle')
            .transition()
            .duration(200)
            .attr('r', piRadius + 8)
            .attr('stroke-width', 5);
        }
      })
      .on('mouseleave', function (event, d: Node) {
        if (!d.isCenter) {
          setHoveredNode(null);
          hideManagementConnection();
          // 노드 원래 크기
          d3.select(this).select('circle')
            .transition()
            .duration(200)
            .attr('r', d.isCenter ? centerRadius : piRadius)
            .attr('stroke-width', 4);
        }
      })
      .on('click', function (event, d: Node) {
        if (!d.isCenter) {
          setSelectedNode(d === selectedNode ? null : d);
        }
      });

    // Central Server 발광 효과
    nodes.filter((d: Node) => d.isCenter === true)
      .append('circle')
      .attr('r', centerRadius + 12)
      .attr('fill', 'none')
      .attr('stroke', '#3182F6')
      .attr('stroke-width', 2)
      .attr('opacity', 0.3)
      .append('animate')
      .attr('attributeName', 'r')
      .attr('from', centerRadius + 12)
      .attr('to', centerRadius + 20)
      .attr('dur', '2s')
      .attr('repeatCount', 'indefinite');

    // 노드 원
    nodes.append('circle')
      .attr('r', (d: Node) => d.isCenter ? centerRadius : piRadius)
      .attr('fill', (d: Node) => {
        if (d.isCenter) return '#3182F6';
        return d.status === 'online' ? '#0BC27C' : '#F04452';
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 4)
      .style('filter', 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.15))');

    // 아이콘
    nodes.append('text')
      .text((d: Node) => d.isCenter ? '🖥️' : '🔧')
      .attr('text-anchor', 'middle')
      .attr('dy', 8)
      .attr('font-size', (d: Node) => d.isCenter ? 48 : 32)
      .attr('pointer-events', 'none');

    // 라벨
    nodes.append('text')
      .text((d: Node) => d.hostname)
      .attr('text-anchor', 'middle')
      .attr('dy', (d: Node) => d.isCenter ? centerRadius + 35 : piRadius + 30)
      .attr('fill', 'var(--foreground)')
      .attr('font-size', (d: Node) => d.isCenter ? 20 : 15)
      .attr('font-weight', 'bold')
      .attr('pointer-events', 'none');

    // 상태 배지 (Pi 노드만)
    nodes.filter((d: Node) => !d.isCenter)
      .append('circle')
      .attr('r', 10)
      .attr('cx', piRadius - 15)
      .attr('cy', -piRadius + 15)
      .attr('fill', (d: Node) => d.status === 'online' ? '#0BC27C' : '#F04452')
      .attr('stroke', '#fff')
      .attr('stroke-width', 3);

    // 관리 연결선 표시 함수
    function showManagementConnection(node: Node) {
      manageLinksGroup.selectAll('*').remove();

      const sx = centerNode.x ?? 0;
      const sy = centerNode.y ?? 0;
      const tx = node.x ?? 0;
      const ty = node.y ?? 0;

      manageLinksGroup.append('line')
        .attr('x1', sx)
        .attr('y1', sy)
        .attr('x2', tx)
        .attr('y2', ty)
        .attr('stroke', '#B0B8C1')
        .attr('stroke-width', 3)
        .attr('stroke-dasharray', '8 4')
        .attr('marker-end', 'url(#arrow-manage)');

      manageLinksGroup.transition().duration(200).style('opacity', 0.6);
    }

    function hideManagementConnection() {
      manageLinksGroup.transition().duration(200).style('opacity', 0);
    }

    // 드래그 핸들러
    function dragstarted(event: any, d: Node) {
      if (!d.isCenter) {
        d.fx = d.x;
        d.fy = d.y;
      }
    }

    function dragged(event: any, d: Node) {
      if (!d.isCenter) {
        d.fx = event.x;
        d.fy = event.y;
        d.x = event.x;
        d.y = event.y;

        d3.select(event.sourceEvent.target.parentNode)
          .attr('transform', `translate(${d.x},${d.y})`);

        // 링 연결선 업데이트
        updateRingLinks();
      }
    }

    function dragended(event: any, d: Node) {
      if (!d.isCenter) {
        d.fx = null;
        d.fy = null;
      }
    }

    function updateRingLinks() {
      ringLinksGroup.selectAll('path').remove();

      topology.edges.forEach((edge) => {
        const source = piNodes.find(n => n.id === edge.from);
        const target = piNodes.find(n => n.id === edge.to);

        if (source && target) {
          const path = ringLinksGroup.append('path')
            .attr('d', calculateRingPath(source, target))
            .attr('stroke', 'url(#flow-gradient)')
            .attr('stroke-width', 5)
            .attr('fill', 'none')
            .attr('marker-end', 'url(#arrow-ring)')
            .attr('opacity', 0.8);

          path.attr('stroke-dasharray', '10 5')
            .append('animate')
            .attr('attributeName', 'stroke-dashoffset')
            .attr('from', '0')
            .attr('to', '30')
            .attr('dur', '1.5s')
            .attr('repeatCount', 'indefinite');
        }
      });
    }

    // 리셋 함수
    (window as any).resetTopologyView = () => {
      svg.transition().duration(750).call(zoom.transform as any, d3.zoomIdentity);
    };

  }, [topology, selectedNode]);

  return (
    <div className="relative">
      {/* 상단 컨트롤 바 */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-800 rounded-xl p-3 toss-shadow flex items-center gap-3 transition-colors duration-200">
        <button
          onClick={() => (window as any).resetTopologyView?.()}
          className="px-4 py-2 bg-[#F2F4F6] hover:bg-[#E5E8EB] dark:bg-gray-700 dark:hover:bg-gray-600 text-[#191F28] dark:text-gray-200 rounded-lg text-[13px] font-semibold transition-colors"
        >
          🔄 리셋
        </button>
        <div className="w-px h-6 bg-[#E5E8EB] dark:bg-gray-700"></div>
        <button
          onClick={() => setShowLegend(!showLegend)}
          className="px-4 py-2 bg-[#F2F4F6] hover:bg-[#E5E8EB] dark:bg-gray-700 dark:hover:bg-gray-600 text-[#191F28] dark:text-gray-200 rounded-lg text-[13px] font-semibold transition-colors"
        >
          {showLegend ? '📋 범례 숨기기' : '📋 범례 보기'}
        </button>
      </div>

      {/* SVG */}
      <svg
        ref={svgRef}
        className="w-full h-[900px] bg-gradient-to-br from-[#FAFBFC] to-[#F2F4F6] dark:from-gray-900 dark:to-gray-950 rounded-2xl border border-[#E5E8EB] dark:border-gray-800 transition-colors duration-200"
      />

      {/* 범례 */}
      {showLegend && (
        <div className="absolute top-20 left-4 bg-white dark:bg-gray-800 rounded-xl p-5 toss-shadow max-w-[240px] transition-colors duration-200">
          <h3 className="font-bold text-[#191F28] dark:text-gray-100 mb-4 text-[15px]">범례</h3>
          <div className="space-y-3 text-[13px]">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-5 h-1 bg-gradient-to-r from-[#3182F6] to-[#60A5FA] rounded"></div>
                <span className="text-[#4E5968] dark:text-gray-300 font-medium">링 연결</span>
              </div>
              <p className="text-[#8B95A1] dark:text-gray-500 text-[12px] ml-7">데이터 흐름 방향</p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-5 h-1 border-t-2 border-dashed border-[#B0B8C1] dark:border-gray-500"></div>
                <span className="text-[#4E5968] dark:text-gray-300 font-medium">관리 연결</span>
              </div>
              <p className="text-[#8B95A1] dark:text-gray-500 text-[12px] ml-7">호버 시 표시</p>
            </div>
            <div className="pt-2 border-t border-[#F2F4F6] dark:border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-4 h-4 rounded-full bg-[#0BC27C]"></div>
                <span className="text-[#4E5968] dark:text-gray-300">온라인</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-[#F04452]"></div>
                <span className="text-[#4E5968] dark:text-gray-300">오프라인</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 상세 정보 패널 */}
      {selectedNode && (
        <div className="absolute top-4 right-4 bg-white dark:bg-gray-800 rounded-xl p-6 toss-shadow w-[320px] transition-colors duration-200">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-5 h-5 rounded-full ${selectedNode.status === 'online' ? 'bg-[#0BC27C]' : 'bg-[#F04452]'}`}></div>
              <h3 className="font-bold text-[#191F28] dark:text-gray-100 text-[18px]">{selectedNode.hostname}</h3>
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-[#8B95A1] dark:text-gray-400 hover:text-[#191F28] dark:hover:text-gray-200 text-[20px]"
            >
              ×
            </button>
          </div>

          <div className="space-y-3 text-[14px]">
            <div>
              <div className="text-[#8B95A1] dark:text-gray-500 text-[12px] font-medium mb-1">상태</div>
              <div className="text-[#191F28] dark:text-gray-200 font-semibold">
                {selectedNode.status === 'online' ? '🟢 온라인' : '🔴 오프라인'}
              </div>
            </div>
            <div>
              <div className="text-[#8B95A1] dark:text-gray-500 text-[12px] font-medium mb-1">Management IP</div>
              <div className="text-[#191F28] dark:text-gray-200 font-mono text-[13px]">{selectedNode.ipManagement}</div>
            </div>
            <div>
              <div className="text-[#8B95A1] dark:text-gray-500 text-[12px] font-medium mb-1">Ring IP</div>
              <div className="text-[#191F28] dark:text-gray-200 font-mono text-[13px]">{selectedNode.ipRing}</div>
            </div>
            <div>
              <div className="text-[#8B95A1] dark:text-gray-500 text-[12px] font-medium mb-1">노드 ID</div>
              <div className="text-[#191F28] dark:text-gray-200 font-mono text-[12px] break-all">{selectedNode.id}</div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-[#F2F4F6] dark:border-gray-700">
            <div className="text-[#8B95A1] dark:text-gray-500 text-[12px] mb-2">연결 정보</div>
            <div className="text-[#4E5968] dark:text-gray-400 text-[13px]">
              ✓ Central Server와 연결됨<br />
              ✓ 링 네트워크 참여 중
            </div>
          </div>
        </div>
      )}

      {/* 툴팁 (호버) */}
      {hoveredNode && !selectedNode && (
        <div className="absolute bottom-4 left-4 bg-white dark:bg-gray-800 rounded-xl p-4 toss-shadow min-w-[200px] transition-colors duration-200">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-3 h-3 rounded-full ${hoveredNode.status === 'online' ? 'bg-[#0BC27C]' : 'bg-[#F04452]'}`}></div>
            <span className="font-bold text-[#191F28] dark:text-gray-100 text-[15px]">{hoveredNode.hostname}</span>
          </div>
          <div className="text-[13px] text-[#6B7684] dark:text-gray-400 space-y-1">
            <div>{hoveredNode.ipManagement}</div>
            <div className="text-[#8B95A1] dark:text-gray-500 text-[12px]">호버하여 관리 연결 확인</div>
          </div>
        </div>
      )}

      {/* 안내 */}
      <div className="absolute bottom-4 right-4 bg-white/90 dark:bg-gray-800/90 rounded-lg p-3 text-[12px] text-[#8B95A1] dark:text-gray-500">
        💡 노드를 드래그하여 위치 조정 | 클릭하여 상세 정보 확인
      </div>
    </div>
  );
}
