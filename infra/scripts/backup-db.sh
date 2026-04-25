#!/usr/bin/env bash
# backup-db.sh — MSSQL veritabanı yedeği alır ve eski yedekleri temizler.
#
# Kullanım:
#   ./backup-db.sh [ortam]        ortam: prod (varsayılan) | test
#
# Cron örneği (her gece 02:00):
#   0 2 * * * /opt/cargo-pilot/infra/scripts/backup-db.sh prod >> /var/log/cargo-pilot/backup.log 2>&1

set -euo pipefail

ENVIRONMENT="${1:-prod}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/opt/cargo-pilot/backups/mssql/${ENVIRONMENT}"
RETENTION_DAYS=7

# Ortama göre değişkenler
if [[ "${ENVIRONMENT}" == "prod" ]]; then
    CONTAINER="cargo-pilot-mssql-prod"
    ENV_FILE="/opt/cargo-pilot/infra/env/.env.prod"
    DATABASE="CargoPilot"
elif [[ "${ENVIRONMENT}" == "test" ]]; then
    CONTAINER="cargo-pilot-mssql-test"
    ENV_FILE="/opt/cargo-pilot/infra/env/.env.test"
    DATABASE="CargoPilotTest"
else
    echo "[ERROR] Geçersiz ortam: ${ENVIRONMENT}. 'prod' veya 'test' kullanın."
    exit 1
fi

# Env dosyasından SA şifresini oku
if [[ ! -f "${ENV_FILE}" ]]; then
    echo "[ERROR] Env dosyası bulunamadı: ${ENV_FILE}"
    exit 1
fi
SA_PASSWORD=$(grep -E '^MSSQL_SA_PASSWORD=' "${ENV_FILE}" | cut -d= -f2- | tr -d '"' | tr -d "'")

if [[ -z "${SA_PASSWORD}" ]]; then
    echo "[ERROR] MSSQL_SA_PASSWORD env dosyasında bulunamadı."
    exit 1
fi

mkdir -p "${BACKUP_DIR}"

BACKUP_FILE="${BACKUP_DIR}/${DATABASE}_${TIMESTAMP}.bak"

echo "[$(date)] Yedek başlatılıyor: ${DATABASE} → ${BACKUP_FILE}"

# Container içinde yedek klasörü oluştur ve BACKUP al
docker exec "${CONTAINER}" mkdir -p /var/opt/mssql/backup

docker exec "${CONTAINER}" \
    /opt/mssql-tools18/bin/sqlcmd \
    -S localhost -U sa -P "${SA_PASSWORD}" -C \
    -Q "BACKUP DATABASE [${DATABASE}] TO DISK = N'/var/opt/mssql/backup/${DATABASE}_${TIMESTAMP}.bak' WITH NOFORMAT, INIT, STATS=10"

# Container'dan host'a kopyala
docker cp "${CONTAINER}:/var/opt/mssql/backup/${DATABASE}_${TIMESTAMP}.bak" "${BACKUP_FILE}"

# Container içindeki geçici yedeği temizle
docker exec "${CONTAINER}" rm -f "/var/opt/mssql/backup/${DATABASE}_${TIMESTAMP}.bak"

# Dosya boyutunu logla
BACKUP_SIZE=$(du -sh "${BACKUP_FILE}" | cut -f1)
echo "[$(date)] Yedek tamamlandı: ${BACKUP_FILE} (${BACKUP_SIZE})"

# Eski yedekleri temizle
echo "[$(date)] ${RETENTION_DAYS} günden eski yedekler temizleniyor..."
find "${BACKUP_DIR}" -name "*.bak" -mtime +${RETENTION_DAYS} -delete
REMAINING=$(find "${BACKUP_DIR}" -name "*.bak" | wc -l)
echo "[$(date)] Kalan yedek sayısı: ${REMAINING}"
