import { Router } from 'express';

export const topologyRouter = Router();

// 토폴로지 시각화는 ifconfig 기반 자동 수집 방식으로 재설계 예정
// 현재는 stub 응답을 반환합니다
topologyRouter.get('/', (_req, res) => {
  res.json({ nodes: [], edges: [], message: 'Topology visualization is being redesigned.' });
});
