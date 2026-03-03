'use client';
import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { TopologyGraph, TopologyNode, TopologyLink } from '@inslab/shared';

// ─── 쿠키 유틸리티 ────────────────────────────────────
function setCookie(name: string, value: string, days: number = 30) {
  const date = new Date();
  date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
  const expires = "expires=" + date.toUTCString();
  document.cookie = name + "=" + encodeURIComponent(value) + ";" + expires + ";path=/";
}

function getCookie(name: string): string | null {
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return decodeURIComponent(c.substring(nameEQ.length, c.length));
  }
  return null;
}

// ─── 타입 ──────────────────────────────────────────
interface NodePos {
  x: number;
  y: number;
  vx: number;
  vy: number;
  name: string;
}

interface Props {
  graph: TopologyGraph;
  scanning: boolean;
  onScan: () => void;
}

// ─── 상수 ──────────────────────────────────────────
const W = 900;
const H = 620;
const NODE_R = 22;
const REPULSION = 8000;
const SPRING_LEN = 130;
const SPRING_K = 0.04;
const DAMPING = 0.85;
const ITER = 200; // 초기 수렴 반복

// ─── 상태 색상 ──────────────────────────────────────
function nodeColor(status: string) {
  if (status === 'online') return { fill: '#0BC27C', ring: '#0BC27C33' };
  if (status === 'offline') return { fill: '#F04452', ring: '#F0445233' };
  return { fill: '#B0B8C1', ring: '#B0B8C133' };
}

function linkColor(status: string) {
  if (status === 'up') return '#0BC27C';
  if (status === 'down') return '#F04452';
  return '#C5CACD';
}

// ─── Force-directed 레이아웃 ─────────────────────────
function computeLayout(nodes: TopologyNode[], links: TopologyLink[], w: number, h: number): Map<string, { x: number; y: number }> {
  const pos = new Map<string, NodePos>();

  // 초기 위치: 원 위에 균등 배치
  nodes.forEach((n, i) => {
    const angle = (2 * Math.PI * i) / nodes.length;
    const r = Math.min(w, h) * 0.35;
    pos.set(n.name, {
      x: w / 2 + r * Math.cos(angle),
      y: h / 2 + r * Math.sin(angle),
      vx: 0, vy: 0,
      name: n.name,
    });
  });

  for (let iter = 0; iter < ITER; iter++) {
    const nodeArr = Array.from(pos.values());

    // 반발력
    for (let i = 0; i < nodeArr.length; i++) {
      for (let j = i + 1; j < nodeArr.length; j++) {
        const a = nodeArr[i], b = nodeArr[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        const force = REPULSION / (dist * dist);
        let fx = (dx / dist) * force;
        let fy = (dy / dist) * force;

        // 추가 겹침 방지 (Collision) 강하게 튕기게 설정
        const minDist = NODE_R * 2 + 50; // 노드 간 최소 거리 확보
        if (dist < minDist) {
          const overlapForce = (minDist - dist) * 1.5;
          fx += (dx / dist) * overlapForce;
          fy += (dy / dist) * overlapForce;
        }

        a.vx -= fx; a.vy -= fy;
        b.vx += fx; b.vy += fy;
      }
    }

    // 스프링 인력
    for (const link of links) {
      const a = pos.get(link.nodeA);
      const b = pos.get(link.nodeB);
      if (!a || !b) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
      const force = SPRING_K * (dist - SPRING_LEN);
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      a.vx += fx; a.vy += fy;
      b.vx -= fx; b.vy -= fy;
    }

    // 중앙 끌림
    for (const p of pos.values()) {
      p.vx += (w / 2 - p.x) * 0.002;
      p.vy += (h / 2 - p.y) * 0.002;
      p.vx *= DAMPING;
      p.vy *= DAMPING;
      p.x = Math.max(NODE_R + 10, Math.min(w - NODE_R - 10, p.x + p.vx));
      p.y = Math.max(NODE_R + 10, Math.min(h - NODE_R - 10, p.y + p.vy));
    }
  }

  const result = new Map<string, { x: number; y: number }>();
  pos.forEach((v, k) => result.set(k, { x: v.x, y: v.y }));
  return result;
}

// ─── 메인 컴포넌트 ─────────────────────────────────────
export function TopologyGraph({ graph, scanning, onScan }: Props) {
  const [positions, setPositions] = useState<Map<string, { x: number; y: number }>>(new Map());
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; node: TopologyNode } | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, px: 0, py: 0 });
  const svgRef = useRef<SVGSVGElement>(null);
  const posRef = useRef(positions);
  posRef.current = positions;

  // 레이아웃 초기화 및 저장된 위치(쿠키) 불러오기
  useEffect(() => {
    if (graph.nodes.length === 0) return;
    
    const saved = getCookie('topology_layout');
    let loadedMap: Map<string, { x: number; y: number }> | null = null;
    
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const map = new Map<string, { x: number; y: number }>(parsed);
        // 저장된 위치 정보에 모든 노드가 포함되어 있는지 확인
        const hasAllNodes = graph.nodes.every(n => map.has(n.name));
        if (hasAllNodes) {
          loadedMap = map;
        }
      } catch (e) {
        console.error('Failed to parse cookie for topology layout', e);
      }
    }

    if (loadedMap) {
      setPositions(loadedMap);
    } else {
      const layout = computeLayout(graph.nodes, graph.links, W, H);
      setPositions(layout);
      setCookie('topology_layout', JSON.stringify(Array.from(layout.entries())));
    }
  }, [graph.nodes.length, graph.links.length]);

  // 위치 다시 정렬하기
  const resetLayout = () => {
    const layout = computeLayout(graph.nodes, graph.links, W, H);
    setPositions(layout);
    setCookie('topology_layout', JSON.stringify(Array.from(layout.entries())));
    setPan({ x: 0, y: 0 });
    setZoom(1);
  };

  const getNodeByName = useCallback((name: string) =>
    graph.nodes.find(n => n.name === name), [graph.nodes]);

  const getLinksForNode = useCallback((name: string) =>
    graph.links.filter(l => l.nodeA === name || l.nodeB === name), [graph.links]);

  const selectedNode = selected ? getNodeByName(selected) : null;
  const selectedLinks = selected ? getLinksForNode(selected) : [];

  // 드래그
  const onNodeMouseDown = (e: React.MouseEvent, name: string) => {
    e.stopPropagation();
    const svgRect = svgRef.current!.getBoundingClientRect();
    const pos = posRef.current.get(name)!;
    const svgX = (e.clientX - svgRect.left - pan.x) / zoom;
    const svgY = (e.clientY - svgRect.top - pan.y) / zoom;
    setDragging(name);
    setDragOffset({ x: svgX - pos.x, y: svgY - pos.y });
    setSelected(name);
    setTooltip(null);
  };

  const onSvgMouseMove = (e: React.MouseEvent) => {
    if (dragging) {
      const svgRect = svgRef.current!.getBoundingClientRect();
      const nx = (e.clientX - svgRect.left - pan.x) / zoom - dragOffset.x;
      const ny = (e.clientY - svgRect.top - pan.y) / zoom - dragOffset.y;
      setPositions(prev => {
        const next = new Map(prev);
        next.set(dragging, { x: nx, y: ny });
        return next;
      });
    } else if (isPanning) {
      setPan({
        x: panStart.current.px + (e.clientX - panStart.current.x),
        y: panStart.current.py + (e.clientY - panStart.current.y),
      });
    }
  };

  const onSvgMouseUp = () => { 
    if (dragging) {
      // 드래그가 끝났을 때 쿠키에 위치를 저장
      setCookie('topology_layout', JSON.stringify(Array.from(posRef.current.entries())));
    }
    setDragging(null); 
    setIsPanning(false); 
  };

  const onSvgMouseDown = (e: React.MouseEvent) => {
    if (e.target === svgRef.current || (e.target as SVGElement).tagName === 'rect') {
      setIsPanning(true);
      panStart.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
      setSelected(null);
    }
  };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoom(z => Math.max(0.3, Math.min(3, z - e.deltaY * 0.001)));
  };

  if (graph.nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-[500px] bg-white dark:bg-gray-800 rounded-2xl">
        <p className="text-[#8B95A1] dark:text-gray-500">토폴로지 데이터를 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="flex gap-4 h-[640px]">
      {/* SVG 캔버스 */}
      <div className="flex-1 bg-white dark:bg-gray-800 rounded-2xl overflow-hidden relative" style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
        {/* 상단 컨트롤 */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10 pointer-events-none">
          <div className="flex items-center gap-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur rounded-xl px-3 py-2 pointer-events-auto" style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.08)' }}>
            <span className="text-[12px] text-[#6B7684] dark:text-gray-400 font-medium">
              {graph.nodes.length}노드 · {graph.links.length}링크
            </span>
            {graph.scannedAt && (
              <span className="text-[11px] text-[#B0B8C1]">
                스캔: {new Date(graph.scannedAt * 1000).toLocaleTimeString('ko-KR')}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              onClick={resetLayout}
              className="flex items-center gap-1.5 bg-white dark:bg-gray-800 border border-[#E5E8EB] dark:border-gray-700 hover:bg-[#F9FAFB] dark:hover:bg-gray-700 text-[#4E5968] dark:text-gray-300 text-[13px] font-semibold px-4 py-2 rounded-xl transition-all"
              style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              다시 정렬하기
            </button>
            <button
              onClick={onScan}
              disabled={scanning}
              className="flex items-center gap-1.5 bg-[#3182F6] hover:bg-[#1B64DA] disabled:bg-[#B0B8C1] text-white text-[13px] font-semibold px-4 py-2 rounded-xl transition-all"
              style={{ boxShadow: '0 1px 6px rgba(49,130,246,0.3)' }}
            >
              {scanning ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  스캔 중...
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  SSH 스캔
                </>
              )}
            </button>
          </div>
        </div>

        {/* 범례 */}
        <div className="absolute bottom-3 left-3 flex items-center gap-3 bg-white/90 dark:bg-gray-800/90 backdrop-blur rounded-xl px-3 py-2 z-10" style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.08)' }}>
          {[['online', '#0BC27C', '온라인'], ['offline', '#F04452', '오프라인'], ['unknown', '#B0B8C1', '미확인']].map(([, c, l]) => (
            <span key={l} className="flex items-center gap-1 text-[11px] text-[#6B7684] dark:text-gray-400">
              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: c }} />
              {l}
            </span>
          ))}
        </div>

        {/* 줌 힌트 */}
        <div className="absolute bottom-3 right-3 text-[11px] text-[#B0B8C1] z-10">
          스크롤: 줌 · 드래그: 이동
        </div>

        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="xMidYMid meet"
          onMouseMove={onSvgMouseMove}
          onMouseUp={onSvgMouseUp}
          onMouseLeave={onSvgMouseUp}
          onMouseDown={onSvgMouseDown}
          onWheel={onWheel}
          style={{ cursor: isPanning ? 'grabbing' : 'grab', userSelect: 'none' }}
        >
          {/* 배경 */}
          <rect width={W} height={H} fill="transparent" />

          <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
            {/* 엣지 */}
            {graph.links.map(link => {
              const a = positions.get(link.nodeA);
              const b = positions.get(link.nodeB);
              if (!a || !b) return null;
              const isHighlighted = selected && (link.nodeA === selected || link.nodeB === selected);
              const mx = (a.x + b.x) / 2;
              const my = (a.y + b.y) / 2;
              const color = isHighlighted ? linkColor(link.status) : (link.status === 'up' ? '#0BC27C55' : link.status === 'down' ? '#F0445255' : '#D1D6DB');
              return (
                <g key={link.id}>
                  <line
                    x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                    stroke={color}
                    strokeWidth={isHighlighted ? 2.5 : 1.5}
                    strokeDasharray={link.status === 'down' ? '5 3' : undefined}
                    opacity={selected && !isHighlighted ? 0.25 : 1}
                    style={{ transition: 'opacity 0.2s' }}
                  />
                  {isHighlighted && (
                    <text x={mx} y={my - 5} textAnchor="middle" fontSize={9} fill="#6B7684" fontFamily="monospace">
                      {link.iface} · VLAN{link.vlan}
                    </text>
                  )}
                </g>
              );
            })}

            {/* 노드 */}
            {graph.nodes.map(node => {
              const pos = positions.get(node.name);
              if (!pos) return null;
              const { fill, ring } = nodeColor(node.status);
              const isSelected = selected === node.name;
              const isHovered = hovered === node.name;
              const opacity = selected && !isSelected ? 0.4 : 1;

              return (
                <g
                  key={node.name}
                  transform={`translate(${pos.x},${pos.y})`}
                  style={{ cursor: 'grab', opacity, transition: 'opacity 0.2s' }}
                  onMouseDown={e => onNodeMouseDown(e, node.name)}
                  onMouseEnter={e => {
                    setHovered(node.name);
                    const svgRect = svgRef.current!.getBoundingClientRect();
                    const svgX = (e.clientX - svgRect.left - pan.x) / zoom;
                    const svgY = (e.clientY - svgRect.top - pan.y) / zoom;
                    setTooltip({ x: svgX, y: svgY - 10, node });
                  }}
                  onMouseLeave={() => { setHovered(null); setTooltip(null); }}
                >
                  {/* 선택/호버 링 */}
                  {(isSelected || isHovered) && (
                    <circle r={NODE_R + 8} fill={ring} />
                  )}
                  {/* 노드 원 */}
                  <circle
                    r={NODE_R}
                    fill={fill}
                    stroke={isSelected ? '#191F28' : 'white'}
                    strokeWidth={isSelected ? 2.5 : 2}
                  />
                  {/* 이름 */}
                  <text
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={10}
                    fontWeight="700"
                    fill="white"
                    fontFamily="'Inter', sans-serif"
                    style={{ pointerEvents: 'none' }}
                  >
                    {node.name}
                  </text>
                </g>
              );
            })}

            {/* 툴팁 */}
            {tooltip && !dragging && (
              <g transform={`translate(${tooltip.x},${tooltip.y})`} style={{ pointerEvents: 'none' }}>
                <rect x={-70} y={-54} width={140} height={50} rx={8} fill="#191F28" opacity={0.9} />
                <text textAnchor="middle" y={-34} fontSize={11} fontWeight="700" fill="white">{tooltip.node.name}</text>
                <text textAnchor="middle" y={-18} fontSize={9.5} fill="#8B95A1">관리: {tooltip.node.mgmtIp}</text>
                <text textAnchor="middle" y={-5} fontSize={9.5} fill="#8B95A1">{tooltip.node.interfaces.join(' · ')}</text>
              </g>
            )}
          </g>
        </svg>
      </div>

      {/* 우측 상세 패널 */}
      <div className={`w-64 bg-white dark:bg-gray-800 rounded-2xl p-4 flex flex-col transition-all duration-200 overflow-hidden ${selectedNode ? 'opacity-100' : 'opacity-40'}`} style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
        {selectedNode ? (
          <>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: nodeColor(selectedNode.status).fill }} />
              <h3 className="text-[16px] font-bold text-[#191F28] dark:text-gray-50">{selectedNode.name}</h3>
              <button onClick={() => setSelected(null)} className="ml-auto text-[#B0B8C1] hover:text-[#6B7684]">✕</button>
            </div>
            <div className="text-[12px] text-[#6B7684] dark:text-gray-400 mb-1">관리망 IP</div>
            <div className="font-mono text-[13px] text-[#191F28] dark:text-gray-200 mb-3">{selectedNode.mgmtIp}</div>
            <div className="text-[12px] text-[#6B7684] dark:text-gray-400 mb-2">연결 링크 ({selectedLinks.length}개)</div>
            <div className="flex-1 overflow-y-auto space-y-1.5">
              {selectedLinks.map(link => {
                const peer = link.nodeA === selectedNode.name ? link.nodeB : link.nodeA;
                const myIp = link.nodeA === selectedNode.name ? link.ipA : link.ipB;
                const peerIp = link.nodeA === selectedNode.name ? link.ipB : link.ipA;
                const color = linkColor(link.status);
                return (
                  <div key={link.id} className="rounded-xl p-2.5 bg-[#F9FAFB] dark:bg-gray-700">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                      <span className="font-semibold text-[13px] text-[#191F28] dark:text-gray-100">{peer}</span>
                      <span className="ml-auto text-[10px] font-mono text-[#B0B8C1]">VLAN{link.vlan}</span>
                    </div>
                    <div className="text-[11px] font-mono text-[#6B7684] dark:text-gray-400">{link.iface}</div>
                    <div className="text-[10px] font-mono text-[#B0B8C1]">{myIp} → {peerIp}</div>
                    {link.source === 'discovered' && (
                      <span className="text-[10px] bg-[#E8F3FF] dark:bg-blue-900 text-[#3182F6] dark:text-blue-300 px-1.5 py-0.5 rounded-full font-medium">수집됨</span>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <svg className="w-8 h-8 text-[#D1D6DB] dark:text-gray-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5" />
            </svg>
            <p className="text-[13px] text-[#B0B8C1] dark:text-gray-500">노드를 클릭하면<br />상세 정보가 표시됩니다</p>
          </div>
        )}
      </div>
    </div>
  );
}
