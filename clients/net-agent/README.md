# net-agent

PI에서 `/proc/net/dev`를 읽어 네트워크 인터페이스 샘플을 수집하고, 로컬 스풀에 저장한 뒤 `log-server`에 TCP로 전송하는 경량 에이전트입니다.

## 특징

- C 단일 바이너리
- `/proc/net/dev` 기반 수집
- 로컬 NDJSON 스풀
- 서버 `ACK` 수신 후에만 스풀 커밋
- 스풀 용량 초과 시 가장 오래된 미전송 샘플부터 삭제

## 빌드

```sh
make
```

## 설치 예시

```sh
sudo mkdir -p /opt/net-agent /etc/net-agent /var/lib/net-agent
sudo cp net-agent /opt/net-agent/
sudo cp net-agent.env.sample /etc/net-agent/net-agent.env
sudo cp net-agent.service /etc/systemd/system/net-agent.service
sudo systemctl daemon-reload
sudo systemctl enable --now net-agent
```

## 환경 변수

- `NODE_ID`: 송신 노드 ID
- `LOG_SERVER_HOST`: 원격 `log-server` 호스트
- `LOG_SERVER_PORT`: 원격 `log-server` TCP 포트
- `SAMPLE_INTERVAL_SEC`: 수집 주기
- `SPOOL_PATH`: 로컬 스풀 파일 경로
- `MAX_SPOOL_BYTES`: 스풀 최대 크기
- `AGENT_VERSION`: 에이전트 버전 문자열
