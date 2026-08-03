#!/usr/bin/env bash
# rollback.sh — Önceki başarılı deploy'a geri döner.
#
# Kullanım:
#   ./rollback.sh [ortam] [git-ref]
#
#   ortam   : prod | test (varsayılan: prod)
#   git-ref : geri dönülecek tag veya commit SHA
#             belirtilmezse bir önceki tag'e döner
#
# Örnekler:
#   ./rollback.sh prod                  # prod'da önceki tag'e dön
#   ./rollback.sh prod v1.2.3           # prod'da belirli tag'e dön
#   ./rollback.sh test abc1234          # test'te belirli commit'e dön

set -euo pipefail

ENVIRONMENT="${1:-prod}"
TARGET_REF="${2:-}"
DEPLOY_DIR="/opt/cargo-pilot"

if [[ "${ENVIRONMENT}" == "prod" ]]; then
    COMPOSE_FILE="${DEPLOY_DIR}/infra/compose/docker-compose.prod.yml"
    ENV_FILE="${DEPLOY_DIR}/infra/env/.env.prod"
elif [[ "${ENVIRONMENT}" == "test" ]]; then
    COMPOSE_FILE="${DEPLOY_DIR}/infra/compose/docker-compose.test.yml"
    ENV_FILE="${DEPLOY_DIR}/infra/env/.env.test"
else
    echo "[ERROR] Geçersiz ortam: ${ENVIRONMENT}"
    exit 1
fi

cd "${DEPLOY_DIR}"

# Hedef ref belirlenmemişse bir önceki tag'i bul
if [[ -z "${TARGET_REF}" ]]; then
    CURRENT_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
    if [[ -z "${CURRENT_TAG}" ]]; then
        echo "[ERROR] Mevcut tag bulunamadı. Hedef ref manuel belirtin."
        exit 1
    fi
    TARGET_REF=$(git describe --tags --abbrev=0 "${CURRENT_TAG}^" 2>/dev/null || echo "")
    if [[ -z "${TARGET_REF}" ]]; then
        echo "[ERROR] Önceki tag bulunamadı."
        exit 1
    fi
fi

echo "[$(date)] Rollback başlatılıyor: ${ENVIRONMENT} → ${TARGET_REF}"

# Yedek al (rollback öncesi güvenlik)
echo "[$(date)] Rollback öncesi DB yedeği alınıyor..."
"${DEPLOY_DIR}/infra/scripts/backup-db.sh" "${ENVIRONMENT}" || {
    echo "[WARN] Yedek alınamadı, devam ediliyor..."
}

# Kodu hedef ref'e çek
echo "[$(date)] Kod ${TARGET_REF} sürümüne getiriliyor..."
git fetch --tags origin
git checkout "${TARGET_REF}"

# Stack'i yeniden başlat
echo "[$(date)] Stack yeniden başlatılıyor..."
docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" \
    down --remove-orphans

if [[ "${ENVIRONMENT}" == "test" ]]; then
    # Test ortamı: GHCR'dan immutable tag ile çek (--build yapılmaz)
    TARGET_SHA=$(git rev-parse --short=7 "${TARGET_REF}" 2>/dev/null || echo "")
    if [[ -z "${TARGET_SHA}" ]]; then
        echo "[ERROR] '${TARGET_REF}' için SHA türetilemedi."
        exit 1
    fi
    export IMAGE_TAG="test-${TARGET_SHA}"
    echo "[$(date)] GHCR'dan image çekiliyor: IMAGE_TAG=${IMAGE_TAG}"
    IMAGE_TAG="${IMAGE_TAG}" docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" \
        pull backend frontend
    IMAGE_TAG="${IMAGE_TAG}" docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" \
        up -d --no-build
else
    # Prod ortamı: local build (prod pipeline henüz hazır değil)
    docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" \
        up -d --build
fi

# Sağlık kontrolü
echo "[$(date)] Sağlık kontrolü bekleniyor (60s)..."
sleep 20

BACKEND_PORT=$(grep -E '^BACKEND_PORT=' "${ENV_FILE}" | cut -d= -f2 | tr -d '"')
for i in $(seq 1 8); do
    if curl -sf "http://localhost:${BACKEND_PORT}/health" > /dev/null 2>&1; then
        echo "[$(date)] Rollback başarılı — backend sağlıklı (${TARGET_REF})"
        docker image prune -f
        exit 0
    fi
    echo "[$(date)] Bekleniyor... ($i/8)"
    sleep 5
done

echo "[ERROR] Rollback sonrası backend sağlık kontrolü başarısız!"
echo "Logları inceleyin: docker compose -f ${COMPOSE_FILE} logs --tail=50"
exit 1
