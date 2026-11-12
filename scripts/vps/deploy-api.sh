#!/usr/bin/env bash
# ==============================================================================
# Deploy GIMS API Backend (Go + Docker) ke VPS tanpa registry & tanpa GitHub.
#   build lokal -> docker save | gzip | ssh -> docker load -> compose up
#
# Pemakaian:
#   VPS_HOST=api-gione.gilabs.id bash scripts/vps/deploy-api.sh
#   SYNC_ENV=1 VPS_HOST=api-gione.gilabs.id bash scripts/vps/deploy-api.sh
# ==============================================================================
set -euo pipefail

cd "$(dirname "$0")/../.."

VPS_HOST="${VPS_HOST:-api-gione.gilabs.id}"
VPS_USER="${VPS_USER:-root}"
REMOTE_DIR="${REMOTE_DIR:-/opt/gims-api}"
KEEP_IMAGES="${KEEP_IMAGES:-3}"
ENV_FILE="${API_ENV_FILE:-apps/api/.env.production}"
IMAGE="gims-api"
CONTAINER_NAME="gims_api"

[[ -n "$VPS_HOST" ]] || read -rp "Hostname/IP VPS (default: api-gione.gilabs.id): " VPS_HOST
VPS_HOST="${VPS_HOST:-api-gione.gilabs.id}"

command -v docker >/dev/null || { echo "Error: docker lokal tidak ditemukan."; exit 1; }

# Prioritas penentuan tag:
# 1. Env/Argumen TAG (misal TAG=v1.0.0)
# 2. Git Tag jika commit saat ini ditag (misal v1.0.0)
# 3. Format tanggal-hash commit (misal 20261112-220000-6d2bfcc)
GIT_TAG="$(git describe --tags --exact-match 2>/dev/null || echo "")"
DEFAULT_TAG="${GIT_TAG:-$(date -u +%Y%m%d-%H%M%S)-$(git rev-parse --short HEAD 2>/dev/null || echo nogit)}"
TAG="${TAG:-$DEFAULT_TAG}"
SSH_TARGET="$VPS_USER@$VPS_HOST"

echo "=================================================="
echo " Target VPS   : $SSH_TARGET"
echo " Direktori    : $REMOTE_DIR"
echo " Image Target : $IMAGE:$TAG"
echo "=================================================="

# SSH Multiplexing: Pakai 1 koneksi untuk seluruh skrip (input password cukup 1x)
SSH_SOCKET="/tmp/ssh-gims-api-$$.sock"
SSH_OPTS=(-o "ControlMaster=auto" -o "ControlPath=$SSH_SOCKET" -o "ControlPersist=120s" -o "ConnectTimeout=15")
trap 'ssh -O exit -o "ControlPath=$SSH_SOCKET" "$SSH_TARGET" 2>/dev/null || true; rm -f "$SSH_SOCKET"' EXIT

r_ssh() {
  ssh "${SSH_OPTS[@]}" "$@"
}

r_scp() {
  scp "${SSH_OPTS[@]}" "$@"
}

echo "==> [1/5] Build image $IMAGE:$TAG di mesin lokal"
DOCKER_BUILDKIT=1 docker build \
  -f apps/api/Dockerfile \
  -t "$IMAGE:$TAG" -t "$IMAGE:latest" apps/api

echo "==> [2/5] Menyiapkan $REMOTE_DIR di VPS"
r_ssh "$SSH_TARGET" "mkdir -p '$REMOTE_DIR' && chmod 700 '$REMOTE_DIR'"
r_scp -q scripts/vps/api.compose.yml "$SSH_TARGET:$REMOTE_DIR/docker-compose.yml"

# Sinkronisasi .env jika ada file lokal atau dipaksa via SYNC_ENV=1
if [[ -f "$ENV_FILE" ]]; then
  if [[ "${SYNC_ENV:-0}" == "1" ]] || ! r_ssh "$SSH_TARGET" "test -f '$REMOTE_DIR/.env'"; then
    echo "    Mengirim env runtime -> $REMOTE_DIR/.env"
    r_scp -q "$ENV_FILE" "$SSH_TARGET:$REMOTE_DIR/.env"
    r_ssh "$SSH_TARGET" "chmod 600 '$REMOTE_DIR/.env'"
  else
    echo "    File $REMOTE_DIR/.env sudah ada di VPS (gunakan SYNC_ENV=1 untuk menimpa)."
  fi
else
  if ! r_ssh "$SSH_TARGET" "test -f '$REMOTE_DIR/.env'"; then
    echo "    [PERINGATAN] File $ENV_FILE tidak ditemukan di lokal dan belum ada di VPS!"
    echo "    Silakan pastikan $REMOTE_DIR/.env sudah disiapkan di VPS sebelum container dijalankan."
  fi
fi

echo "==> [3/5] Mengirim image ke VPS (gzip via SSH pipe)"
docker save "$IMAGE:$TAG" | gzip -1 | r_ssh "$SSH_TARGET" "gunzip | docker load"

echo "==> [4/5] Menjalankan container di VPS"
r_ssh "$SSH_TARGET" "cd '$REMOTE_DIR' \
  && { grep -q '^API_TAG=' .env 2>/dev/null && sed -i 's|^API_TAG=.*|API_TAG=$TAG|' .env || echo 'API_TAG=$TAG' >> .env; } \
  && docker compose up -d --remove-orphans"

echo "==> [5/5] Health check di VPS"
if r_ssh "$SSH_TARGET" bash -s <<EOF
set -e
printf "    Menunggu container sehat"
for i in \$(seq 1 30); do
  status=\$(docker inspect -f '{{.State.Health.Status}}' '$CONTAINER_NAME' 2>/dev/null || echo "starting")
  if [ "\$status" = "healthy" ]; then
    echo " [OK: SEHAT]"
    echo "    Membersihkan image lama di VPS (menyimpan $KEEP_IMAGES versi terakhir)..."
    docker images "$IMAGE" --format '{{.Tag}}' | grep -v '^latest\$' | sort -r | tail -n +$((KEEP_IMAGES + 1)) | xargs -r -I{} docker rmi "$IMAGE:{}" 2>/dev/null || true
    docker image prune -f >/dev/null 2>&1 || true
    exit 0
  fi
  printf "."
  sleep 2
done
echo " [TIMEOUT]"
echo "Status terakhir: \$status"
echo "Log container terakhir:"
docker logs --tail 50 '$CONTAINER_NAME' || true
exit 1
EOF
then
  echo ""
  echo "=================================================="
  echo " Deployment GIMS API Berhasil!"
  echo " Versi aktif : $TAG"
  echo " Domain API  : https://$VPS_HOST/"
  echo " Healthcheck : https://$VPS_HOST/health"
  echo "=================================================="
else
  echo ""
  echo "Container gagal sehat. Untuk rollback: bash scripts/vps/rollback-api.sh"
  exit 1
fi
