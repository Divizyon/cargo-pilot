#!/usr/bin/env bash
# setup-backup-cron.sh — Sunucuya otomatik yedekleme cron'u kurar.
# Sunucuda bir kez çalıştırılır.

set -euo pipefail

DEPLOY_DIR="/opt/cargo-pilot"
LOG_DIR="/var/log/cargo-pilot"
BACKUP_DIR="/opt/cargo-pilot/backups"

# Dizinleri oluştur
mkdir -p "${LOG_DIR}"
mkdir -p "${BACKUP_DIR}/mssql/prod"
mkdir -p "${BACKUP_DIR}/mssql/test"

# Scriptleri çalıştırılabilir yap
chmod +x "${DEPLOY_DIR}/infra/scripts/backup-db.sh"
chmod +x "${DEPLOY_DIR}/infra/scripts/rollback.sh"
chmod +x "${DEPLOY_DIR}/infra/scripts/restore-db.sh"
chmod +x "${DEPLOY_DIR}/infra/scripts/verify-backup.sh"

# Cron job'larını ekle (mevcut crontab'ı koru)
CRON_CONTENT=$(crontab -l 2>/dev/null || echo "")

add_cron() {
    local entry="$1"
    local comment="$2"
    if echo "${CRON_CONTENT}" | grep -qF "${entry}"; then
        echo "Zaten mevcut: ${comment}"
    else
        CRON_CONTENT="${CRON_CONTENT}
# ${comment}
${entry}"
        echo "Eklendi: ${comment}"
    fi
}

# Prod DB — her gece 02:00
add_cron \
    "0 2 * * * ${DEPLOY_DIR}/infra/scripts/backup-db.sh prod >> ${LOG_DIR}/backup-prod.log 2>&1" \
    "Cargo Pilot - Prod DB yedek"

# Test DB — her gece 03:00
add_cron \
    "0 3 * * * ${DEPLOY_DIR}/infra/scripts/backup-db.sh test >> ${LOG_DIR}/backup-test.log 2>&1" \
    "Cargo Pilot - Test DB yedek"

# Prod yedek doğrulaması — her Pazar 04:00
add_cron \
    "0 4 * * 0 ${DEPLOY_DIR}/infra/scripts/verify-backup.sh prod >> ${LOG_DIR}/verify-backup.log 2>&1" \
    "Cargo Pilot - Prod yedek doğrulama"

# Crontab'a yaz
echo "${CRON_CONTENT}" | crontab -

echo ""
echo "Cron kurulumu tamamlandı:"
crontab -l | grep -A1 "Cargo Pilot"
echo ""
echo "Yedek dizini: ${BACKUP_DIR}"
echo "Log dizini  : ${LOG_DIR}"
