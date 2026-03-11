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
./manage.sh build
```

## 설치 예시

```sh
sudo ./manage.sh install
```

`/api/pis/:id/net-agent-config`에서 발급한 값을 `/etc/net-agent/net-agent.env`에 넣는 것을 기준으로 합니다.

## 운영 스크립트

```sh
./manage.sh build
./manage.sh run
sudo ./manage.sh status
sudo ./manage.sh logs
sudo ./manage.sh restart
sudo ./manage.sh stop
sudo ./manage.sh uninstall
```

## 환경 변수

- `NODE_ID`: 송신 노드 ID
- `LOG_SERVER_HOST`: 원격 `log-server` 호스트
- `LOG_SERVER_PORT`: 원격 `log-server` TCP 포트
- `PROTOCOL_VERSION`: `log-server`와 맞춰야 하는 프로토콜 버전
- `AUTH_TOKEN`: `central-server`가 발급한 서명 토큰
- `SAMPLE_INTERVAL_SEC`: 수집 주기
- `SPOOL_PATH`: 로컬 스풀 파일 경로
- `MAX_SPOOL_BYTES`: 스풀 최대 크기
- `AGENT_VERSION`: 에이전트 버전 문자열

## 설치 후 반드시 확인할 것

- `/etc/net-agent/net-agent.env`의 `NODE_ID`
- `/etc/net-agent/net-agent.env`의 `LOG_SERVER_HOST`
- `/etc/net-agent/net-agent.env`의 `LOG_SERVER_PORT`
- `/etc/net-agent/net-agent.env`의 `PROTOCOL_VERSION`
- `/etc/net-agent/net-agent.env`의 `AUTH_TOKEN`
- `/var/lib/net-agent/` 쓰기 권한
