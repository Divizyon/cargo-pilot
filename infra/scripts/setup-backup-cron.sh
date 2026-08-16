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

# Yedek dizinleri tüm müşteri verisini barındırır; host'taki diğer kullanıcılara
# kapalı olmalı (backup-db.sh de her koşumda aynı izni uygular).
chmod 700 "${BACKUP_DIR}" "${BACKUP_DIR}/mssql" "${BACKUP_DIR}/mssql/prod" "${BACKUP_DIR}/mssql/test"

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

# Bir ortamın cron'u yalnızca o ortam sunucuda gerçekten varsa kurulur.
# backup-db.sh / verify-backup.sh ilk iş olarak .env.<ortam> dosyasını okur ve
# yoksa hata verir. Prod stack henüz deploy edilmediği için (.env.prod yok)
# kurulan prod cron'ları her gece hata basıyor ve alarm yorgunluğu üretiyordu —
# gerçek bir yedekleme arızasını gizleyecek gürültü. Bu yüzden ortam hazır
# değilse cron kurulmaz; ama sessizce değil, açık bir mesajla atlanır.
ortam_hazir() {
    [[ -f "${DEPLOY_DIR}/infra/env/.env.$1" ]]
}

ortam_atlandi() {
    local environment="$1"
    echo "[ATLANDI] ${environment} ortamı hazır değil: ${DEPLOY_DIR}/infra/env/.env.${environment} yok."
    echo "          ${environment} cron'ları KURULMADI (kurulsalardı her gece hata basarlardı)."
    echo "          Ortam deploy edildikten sonra bu script'i tekrar çalıştırın."
    if echo "${CRON_CONTENT}" | grep -qF "backup-db.sh ${environment}"; then
        echo "[UYARI]  crontab'da ${environment} girdisi ZATEN VAR ama ortam hazır değil."
        echo "         Bu girdi şu anda her gece hata basıyor; 'crontab -e' ile elle kaldırın."
    fi
}

# Cron satırlarında `bash ` öneki ikinci savunma hattıdır: repo'dan gelen dosyada
# execute biti düşerse yedekleme sessizce "permission denied" ile durmaz.

if ortam_hazir prod; then
    # Prod DB — her gece 02:00
    add_cron \
        "0 2 * * * bash ${DEPLOY_DIR}/infra/scripts/backup-db.sh prod >> ${LOG_DIR}/backup-prod.log 2>&1" \
        "Cargo Pilot - Prod DB yedek"

    # Prod yedek doğrulaması — her Pazar 04:00
    add_cron \
        "0 4 * * 0 bash ${DEPLOY_DIR}/infra/scripts/verify-backup.sh prod >> ${LOG_DIR}/verify-backup.log 2>&1" \
        "Cargo Pilot - Prod yedek doğrulama"
else
    ortam_atlandi prod
fi

if ortam_hazir test; then
    # Test DB — her gece 03:00
    add_cron \
        "0 3 * * * bash ${DEPLOY_DIR}/infra/scripts/backup-db.sh test >> ${LOG_DIR}/backup-test.log 2>&1" \
        "Cargo Pilot - Test DB yedek"
else
    ortam_atlandi test
fi

# Crontab'a yaz
echo "${CRON_CONTENT}" | crontab -

echo ""
echo "Cron kurulumu tamamlandı:"
# `|| true`: hiçbir ortam hazır değilse grep eşleşme bulamaz ve `set -e` altında
# script tam burada, kurulum özetini basmadan hata koduyla ölürdü.
crontab -l | grep -A1 "Cargo Pilot" || echo "(kurulu Cargo Pilot cron girdisi yok)"
echo ""
echo "Yedek dizini: ${BACKUP_DIR}"
echo "Log dizini  : ${LOG_DIR}"
