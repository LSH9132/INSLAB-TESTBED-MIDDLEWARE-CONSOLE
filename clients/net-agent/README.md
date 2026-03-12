# net-agent

`net-agent`는 각 Raspberry Pi에서 인터페이스별 RX/TX 카운터를 읽어 `log-server`로 전송하는 C 기반 단일 바이너리입니다.

## Responsibilities

- `/proc/net/dev` 기반 인터페이스 샘플 수집
- 로컬 NDJSON 스풀 유지
- TCP 전송 후 `ACK`를 받은 샘플만 커밋
- 서버 장애 시 재전송 가능한 형태로 로컬 보관

## Build

```sh
make
```

또는:

```sh
./manage.sh build
```

## Install

```sh
sudo ./manage.sh install
```

설치 후 `/etc/net-agent/net-agent.env`를 배치해야 합니다. 이 값은 보통 `central-server`의 `GET /api/pis/:id/net-agent-config` 응답을 기준으로 생성합니다.

## Common Operations

```sh
./manage.sh build
./manage.sh run
sudo ./manage.sh status
sudo ./manage.sh logs
sudo ./manage.sh restart
sudo ./manage.sh stop
sudo ./manage.sh uninstall
```

## Configuration

예시 파일: [`net-agent.env.sample`](/Users/lsh/INSLAB-TESTBED-MIDDLEWARE-CONSOLE/clients/net-agent/net-agent.env.sample)

- `NODE_ID`: `central-server`에 등록된 PI ID와 일치해야 합니다.
- `LOG_SERVER_HOST`: 외부에서 접근 가능한 `log-server` 호스트
- `LOG_SERVER_PORT`: 외부 ingest TCP 포트
- `PROTOCOL_VERSION`: 현재 `1`
- `AUTH_TOKEN`: `central-server`가 발급한 서명 토큰
- `SAMPLE_INTERVAL_SEC`: 샘플링 주기
- `SPOOL_PATH`: 로컬 스풀 파일 경로
- `MAX_SPOOL_BYTES`: 스풀 최대 크기
- `AGENT_VERSION`: 배포 버전 문자열

## Validation Checklist

- `/etc/net-agent/net-agent.env`의 `NODE_ID`가 중앙 등록값과 일치하는지 확인
- `LOG_SERVER_HOST` / `LOG_SERVER_PORT`가 외부에서 실제 열려 있는지 확인
- `AUTH_TOKEN`이 현재 공유 시크릿 기준으로 발급된 값인지 확인
- `/var/lib/net-agent`에 쓰기 권한이 있는지 확인
- `log-server`에서 `ACK`를 반환하는지 확인
