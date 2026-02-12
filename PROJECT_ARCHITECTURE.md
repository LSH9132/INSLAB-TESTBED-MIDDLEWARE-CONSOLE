# INSLAB Testbed Middleware Console - 아키텍처 문서

이 문서는 INSLAB Testbed Middleware Console 프로젝트의 아키텍처, 구성 요소 및 운영 흐름에 대한 포괄적인 개요를 제공합니다.

## 1. 개요 (Overview)

**INSLAB Testbed Middleware Console**은 링 토폴로지로 배치된 라즈베리 파이(Raspberry Pi) 노드 클러스터를 모니터링하고 제어하기 위해 설계된 중앙 집중식 관리 시스템입니다. 다음과 같은 기능을 위한 웹 기반 인터페이스를 제공합니다:

*   **모니터링 (Monitoring)**: 파이 노드의 실시간 상태(온라인/오프라인) 확인.
*   **관리 (Management)**: 테스트베드 내 노드 등록 및 구성.
*   **디버깅 (Debugging)**: 브라우저를 통해 각 노드에 직접 SSH 터미널 접속.
*   **관측가능성 (Observability)**: 모든 노드로부터 로그를 중앙에서 수집 및 조회.
*   **시각화 (Visualization)**: 링 토폴로지의 대화형 그래프 시각화.

## 2. 시스템 아키텍처 (System Architecture)

이 시스템은 **모노레포(Monorepo)** 내에서 관리되는 **마이크로서비스 유사 아키텍처**를 따릅니다. 세 가지 주요 컴포넌트로 구성됩니다:

1.  **Web Console (Frontend)**: 사용자 인터페이스를 제공하는 Next.js 애플리케이션.
2.  **Central Server (Backend)**: 상태, SSH 연결, 상태 확인(Health Check)을 관리하는 핵심 제어 플레인.
3.  **Log Server (Backend)**: 고속 로그 수집 및 저장을 위한 전용 서비스.

```mermaid
graph TD
    subgraph "User Machine"
        Browser[웹 브라우저]
    end

    subgraph "Server Host (Mac/Linux)"
        Web[Web Console (Next.js)]
        Central[Central Server (Express)]
        Log[Log Server (Express + TCP)]
        
        DB_Central[(SQLite: central.sqlite)]
        DB_Logs[(SQLite: logs.sqlite)]
    end

    subgraph "Testbed Network"
        Pi1[Raspberry Pi 1]
        Pi2[Raspberry Pi 2]
        Pi3[Raspberry Pi 3]
    end

    %% Communication Flows
    Browser -- "HTTP / WebSocket (3000)" --> Web
    
    Web -- "Proxy /api (3001)" --> Central
    
    Central -- "Read/Write" --> DB_Central
    Central -- "HTTP Query (3002)" --> Log
    Central -- "SSH (22)" --> Pi1
    Central -- "TCP Check" --> Pi1
    Central -- "SSH (22)" --> Pi2
    Central -- "TCP Check" --> Pi2
    
    Pi1 -- "TCP Log Stream (5140)" --> Log
    Pi2 -- "TCP Log Stream (5140)" --> Log
    Pi3 -- "TCP Log Stream (5140)" --> Log
    
    Log -- "Write" --> DB_Logs
```

## 3. 프로젝트 구조 (Project Structure)

이 프로젝트는 **pnpm workspaces**를 사용하여 애플리케이션과 공유 패키지 간의 의존성을 관리합니다.

```
/
├── apps/
│   ├── central-server/   # 제어 플레인 (Node.js/Express)
│   ├── log-server/       # 로그 관리 (Node.js/Express + TCP)
│   └── web-console/      # 프론트엔드 UI (Next.js 14)
├── packages/
│   └── shared/           # 공유 TypeScript 타입, 상수, 유틸리티
├── docker-compose.yml    # 컨테이너화된 배포를 위한 오케스트레이션
└── pnpm-workspace.yaml   # 워크스페이스 설정
```

## 4. 컴포넌트 상세 (Component Details)

### 4.1. Central Server (`apps/central-server`)
*   **역할**: 시스템의 두뇌 역할.
*   **스택**: Node.js, Express, `better-sqlite3`, `ssh2`, `ws`.
*   **포트**: `3001` (HTTP API & WebSocket).
*   **주요 기능**:
    *   **Pi Registry**: 활성 파이 노드 목록 관리 (CRUD).
    *   **Health Monitor**: 파이의 관리 IP(기본값: TCP 22번 포트 확인)에 주기적으로 연결하여 온라인/오프라인 상태 판별.
    *   **SSH Proxy**: 파이 노드에 SSH 연결을 수립하고 WebSocket(`ws` 라이브러리)을 통해 상태를 Web Console로 파이핑(piping)하여 웹 기반 터미널 기능 제공.
    *   **Topology Management**: 등록된 노드를 기반으로 링 토폴로지 구조 계산.
    *   **Log Proxy**: 프론트엔드 네트워킹 단순화를 위해 로그 조회 요청을 Log Server로 프록시(Proxy).

### 4.2. Log Server (`apps/log-server`)
*   **역할**: 전용 로그 수집기.
*   **스택**: Node.js, Net (TCP), Express (HTTP), `better-sqlite3`.
*   **포트**:
    *   `5140` (TCP): 원시(Raw) 로그 수집.
    *   `3002` (HTTP): 조회 API.
*   **주요 기능**:
    *   **TCP Receiver**: 파이 노드로부터 JSON 형식의 원시 로그 라인을 수신.
    *   **High-Performance Write**: 로그를 버퍼링하여 별도의 SQLite 데이터베이스(`logs.sqlite`)에 기록.
    *   **Query API**: 소스, 목적지, 유형, 시간별로 로그를 필터링하는 엔드포인트 제공.

### 4.3. Web Console (`apps/web-console`)
*   **역할**: 사용자 인터페이스.
*   **스택**: Next.js 14 (App Router), React, Tailwind CSS, Xterm.js, D3.js.
*   **포트**: `3000`.
*   **주요 기능**:
    *   **Dashboard**: 실시간 상태 표시기와 함께 파이 노드 그리드 표시.
    *   **Topology View**: D3.js를 사용하여 링 네트워크 시각화.
    *   **Log Viewer**: 필터링 기능이 있는 시스템 로그의 표 형식 뷰.
    *   **Web Terminal**: Xterm.js를 사용하여 브라우저 내에서 완전히 기능하는 SSH 터미널 제공 (Central Server를 통해 연결).
    *   **API Proxy**: 모든 클라이언트 측 API 호출은 Next.js Rewrites를 통해 백엔드 서비스로 라우팅되어 CORS 문제를 방지하고 설정을 단순화함.

### 4.4. Shared Package (`packages/shared`)
*   **역할**: 단일 진실 공급원 (Single Source of Truth).
*   **내용**:
    *   TypeScript 인터페이스 (`PiNode`, `LogEntry`, `RingTopology`).
    *   상수 (`PORTS`, `API_PATHS`, `TIMEOUTS`).

## 5. 데이터 흐름 및 통신 (Data Flow & Communication)

### 5.1. 실시간 상태 업데이트 (Real-time Status Updates)
1.  **Monitor**: `central-server`의 `PiMonitorService`가 모든 등록된 노드를 순회합니다.
2.  **Check**: 노드의 SSH 포트(기본 22)에 대해 TCP 핸드셰이크를 시도합니다.
3.  **Update**: 상태가 변경되면(예: Online -> Offline) DB를 업데이트합니다.
4.  **Broadcast**: 새로운 상태가 WebSocket(`ws/status`)을 통해 연결된 `web-console` 클라이언트로 푸시(Push)됩니다.

### 5.2. 웹 터미널 (SSH)
1.  **User**: 브라우저에서 특정 Pi에 대한 터미널을 엽니다.
2.  **Connect**: 브라우저가 `central-server`로 WebSocket을 연결합니다 (`/ws/terminal/:id`).
3.  **Proxy**: `central-server`는 설정된 개인 키(`~/.ssh/id_rsa`)를 사용하여 `ssh2`로 대상 Pi에 연결합니다.
4.  **Pipe**: Stdin/Stdout/Stderr가 WebSocket과 SSH 채널 간에 양방향으로 파이핑됩니다.

### 5.3. 로그 수집 및 조회 (Log Ingestion & Query)
1.  **Ingest**: 파이 노드(이 리포지토리에 없는 클라이언트 소프트웨어 실행)가 `log-server:5140`으로 TCP를 통해 JSON 로그를 전송합니다.
2.  **Store**: `log-server`는 로그를 파싱하여 `logs.sqlite`에 삽입합니다.
3.  **Query**: 사용자가 Web Console에서 로그를 요청합니다.
    *   Web Console -> `central-server/api/logs`
    *   Central Server -> `log-server:3002/api/logs`
    *   Log Server -> SQLite 쿼리 -> JSON 반환

## 6. 데이터베이스 스키마 (SQLite)

### Central Database (`central.sqlite`)
| 테이블 | 컬럼 | 타입 | 설명 |
| :--- | :--- | :--- | :--- |
| **`pi_nodes`** | `id` | TEXT (PK) | 고유 노드 ID (UUID) |
| | `hostname` | TEXT | 식별 가능한 이름 |
| | `ip_management` | TEXT | SSH/관리용 IP |
| | `ip_ring` | TEXT | 링 네트워크 트래픽용 IP |
| | `ssh_port` | INTEGER | SSH 포트 (기본 22) |
| | `ssh_user` | TEXT | SSH 사용자명 (기본 'pi') |
| | `status` | TEXT | 'online' / 'offline' / 'unknown' |
| | `last_seen` | INTEGER | 마지막 성공적 확인 타임스탬프 |

### Log Database (`logs.sqlite`)
| 테이블 | 컬럼 | 타입 | 설명 |
| :--- | :--- | :--- | :--- |
| **`logs`** | `id` | INTEGER (PK) | 자동 증가 ID |
| | `timestamp` | INTEGER | 로그 생성 시간 |
| | `source_pi` | TEXT | 발신 노드 ID |
| | `dest_pi` | TEXT | 수신 노드 ID (선택 사항) |
| | `log_type` | TEXT | 'ring_send', 'ring_recv', 'system' |
| | `payload` | TEXT | 로그 메시지 내용 |

## 7. 설정 (Configuration)

*   **환경 변수** (`.env`):
    *   `PORT`: Central Server 포트 (3001).
    *   `LOG_SERVER_URL`: Central이 Log Server에 도달하기 위한 URL.
    *   `SSH_PRIVATE_KEY_PATH`: 파이에 연결하기 위한 호스트의 SSH 키 경로.
    *   `DB_PATH`: SQLite 파일 경로.

*   **Docker**:
    *   `docker-compose.yml`은 데이터 지속성을 위한 공유 볼륨(`central-data`, `log-data`)과 함께 다중 컨테이너 설정을 정의합니다.
