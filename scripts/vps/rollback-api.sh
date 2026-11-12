#!/usr/bin/env bash
# ==============================================================================
# Rollback GIMS API ke image sebelumnya di VPS (instan, tanpa build ulang).
#
# Pemakaian:
#   VPS_HOST=api-gione.gilabs.id bash scripts/vps/rollback-api.sh          # ke 1 tag sebelumnya
#   VPS_HOST=api-gione.gilabs.id bash scripts/vps/rollback-api.sh <tag>    # ke tag spesifik
# ==============================================================================
set -euo pipefail

VPS_HOST="${VPS_HOST:-api-gione.gilabs.id}"
VPS_USER="${VPS_USER:-root}"
REMOTE_DIR="${REMOTE_DIR:-/opt/gims-api}"
IMAGE="gims-api"
CONTAINER_NAME="gims_api"
TARGET_TAG="${1:-}"

[[ -n "$VPS_HOST" ]] || read -rp "Hostname/IP VPS: " VPS_HOST
SSH_TARGET="$VPS_USER@$VPS_HOST"

SSH_SOCKET="/tmp/ssh-gims-api-rollback-$$.sock"
SSH_OPTS=(-o "ControlMaster=auto" -o "ControlPath=$SSH_SOCKET" -o "ControlPersist=60s" -o "ConnectTimeout=15")
trap 'ssh -O exit -o "ControlPath=$SSH_SOCKET" "$SSH_TARGET" 2>/dev/null || true; rm -f "$SSH_SOCKET"' EXIT

r_ssh() {
  ssh "${SSH_OPTS[@]}" "$@"
}

echo "Image $IMAGE yang tersedia di VPS:"
r_ssh "$SSH_TARGET" "docker images '$IMAGE' --format '  {{.Tag}}  ({{.CreatedSince}})' | grep -v ' latest '"

CURRENT="$(r_ssh "$SSH_TARGET" "grep '^API_TAG=' '$REMOTE_DIR/.env' 2>/dev/null | cut -d= -f2 || true")"
echo "Versi aktif saat ini: ${CURRENT:-latest}"

if [[ -z "$TARGET_TAG" ]]; then
  TARGET_TAG="$(r_ssh "$SSH_TARGET" "docker images '$IMAGE' --format '{{.Tag}}' | grep -v '^latest\$' | sort -r | grep -v '^$CURRENT\$' | head -n1")"
fi
[[ -n "$TARGET_TAG" ]] || { echo "Error: Tidak ada image sebelumnya untuk rollback."; exit 1; }

echo "Melakukan rollback ke: $TARGET_TAG"
r_ssh "$SSH_TARGET" "cd '$REMOTE_DIR' \
  && sed -i 's|^API_TAG=.*|API_TAG=$TARGET_TAG|' .env \
  && docker compose up -d api"

echo "Memverifikasi status container setelah rollback..."
sleep 3
r_ssh "$SSH_TARGET" "docker ps --filter 'name=$CONTAINER_NAME' --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'"
echo "Rollback selesai! Versi aktif sekarang: $TARGET_TAG"
