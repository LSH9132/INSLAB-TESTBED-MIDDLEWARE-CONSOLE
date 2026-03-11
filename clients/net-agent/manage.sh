#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${SCRIPT_DIR}"
TARGET_BIN="${PROJECT_DIR}/net-agent"
ENV_SAMPLE="${PROJECT_DIR}/net-agent.env.sample"
SERVICE_FILE="${PROJECT_DIR}/net-agent.service"

INSTALL_DIR="${INSTALL_DIR:-/opt/net-agent}"
ENV_DIR="${ENV_DIR:-/etc/net-agent}"
STATE_DIR="${STATE_DIR:-/var/lib/net-agent}"
SYSTEMD_DIR="${SYSTEMD_DIR:-/etc/systemd/system}"
SERVICE_NAME="${SERVICE_NAME:-net-agent}"

usage() {
  cat <<'EOF'
Usage:
  ./manage.sh build
  ./manage.sh install
  ./manage.sh run
  ./manage.sh status
  ./manage.sh logs
  ./manage.sh restart
  ./manage.sh stop
  ./manage.sh uninstall

Environment overrides:
  INSTALL_DIR   default: /opt/net-agent
  ENV_DIR       default: /etc/net-agent
  STATE_DIR     default: /var/lib/net-agent
  SYSTEMD_DIR   default: /etc/systemd/system
  SERVICE_NAME  default: net-agent
EOF
}

require_root() {
  if [[ "${EUID}" -ne 0 ]]; then
    echo "This command must be run as root." >&2
    exit 1
  fi
}

build() {
  make -C "${PROJECT_DIR}"
}

install_agent() {
  require_root
  build

  mkdir -p "${INSTALL_DIR}" "${ENV_DIR}" "${STATE_DIR}"

  install -m 0755 "${TARGET_BIN}" "${INSTALL_DIR}/net-agent"

  if [[ ! -f "${ENV_DIR}/net-agent.env" ]]; then
    install -m 0644 "${ENV_SAMPLE}" "${ENV_DIR}/net-agent.env"
    echo "Created ${ENV_DIR}/net-agent.env from sample."
  else
    echo "Keeping existing ${ENV_DIR}/net-agent.env."
  fi

  install -m 0644 "${SERVICE_FILE}" "${SYSTEMD_DIR}/${SERVICE_NAME}.service"
  systemctl daemon-reload
  systemctl enable --now "${SERVICE_NAME}"

  echo "Installed ${SERVICE_NAME}."
  echo "Edit ${ENV_DIR}/net-agent.env and set NODE_ID / LOG_SERVER_HOST before relying on data."
}

run_agent() {
  build
  if [[ -f "${ENV_DIR}/net-agent.env" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "${ENV_DIR}/net-agent.env"
    set +a
  elif [[ -f "${ENV_SAMPLE}" ]]; then
    echo "Using sample environment because ${ENV_DIR}/net-agent.env was not found." >&2
    set -a
    # shellcheck disable=SC1090
    source "${ENV_SAMPLE}"
    set +a
  fi

  exec "${TARGET_BIN}"
}

status_agent() {
  require_root
  systemctl status "${SERVICE_NAME}" --no-pager
}

logs_agent() {
  require_root
  journalctl -u "${SERVICE_NAME}" -n 100 --no-pager
}

restart_agent() {
  require_root
  systemctl restart "${SERVICE_NAME}"
}

stop_agent() {
  require_root
  systemctl stop "${SERVICE_NAME}"
}

uninstall_agent() {
  require_root
  systemctl disable --now "${SERVICE_NAME}" || true
  rm -f "${SYSTEMD_DIR}/${SERVICE_NAME}.service"
  systemctl daemon-reload
  rm -f "${INSTALL_DIR}/net-agent"

  echo "Removed ${SERVICE_NAME} service and binary."
  echo "Kept ${ENV_DIR} and ${STATE_DIR} for safety."
}

main() {
  local cmd="${1:-}"

  case "${cmd}" in
    build)
      build
      ;;
    install)
      install_agent
      ;;
    run)
      run_agent
      ;;
    status)
      status_agent
      ;;
    logs)
      logs_agent
      ;;
    restart)
      restart_agent
      ;;
    stop)
      stop_agent
      ;;
    uninstall)
      uninstall_agent
      ;;
    *)
      usage
      exit 1
      ;;
  esac
}

main "$@"
