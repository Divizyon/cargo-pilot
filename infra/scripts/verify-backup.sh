#!/usr/bin/env bash
# verify-backup.sh — Yedek dosyasının geçerliliğini ve geri yüklenebilirliğini doğrular.
#
# RESTORE VERIFYONLY kullanır: yedeği okur, checksum ve başlık kontrolü yapar.
# Veritabanına dokunmaz, mevcut servisi etkilemez.
#
# Kullanım:
#   ./verify-backup.sh [ortam] [yedek-dosyası]
#
#   ortam        : prod | test (varsayılan: prod)
#   yedek-dosyası: tam yol (belirtilmezse en son yedek kullanılır)
#
# Örnekler:
#   ./verify-backup.sh prod
#   ./verify-backup.sh prod /opt/cargo-pilot/backups/mssql/prod/CargoPilot_20240101_020000.bak
#   ./verify-backup.sh test

set -euo pipefail

ENVIRONMENT="${1:-prod}"
BACKUP_FILE="${2:-}"
DEPLOY_DIR="/opt/cargo-pilot"
BACKUP_DIR="${DEPLOY_DIR}/backups/mssql/${ENVIRONMENT}"

# Ortama göre değişkenler
if [[ "${ENVIRONMENT}" == "prod" ]]; then
    CONTAINER="cargo-pilot-mssql-prod"
    ENV_FILE="${DEPLOY_DIR}/infra/env/.env.prod"
    DATABASE="CargoPilot"
elif [[ "${ENVIRONMENT}" == "test" ]]; then
    CONTAINER="cargo-pilot-mssql-test"
    ENV_FILE="${DEPLOY_DIR}/infra/env/.env.test"
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
# `|| true` şart: `set -euo pipefail` altında grep eşleşme bulamazsa (satır yoksa)
# pipeline 1 döner ve script tam bu atama satırında, hiçbir mesaj basmadan ölür.
# Aşağıdaki anlamlı hata bloğuna hiç gelinmez. `|| true` ile boş değer atanır,
# hatayı `if [[ -z ]]` kontrolü açıkça raporlar.
SA_PASSWORD=$(grep -E '^MSSQL_SA_PASSWORD=' "${ENV_FILE}" | cut -d= -f2- | tr -d '"' | tr -d "'" || true)

if [[ -z "${SA_PASSWORD}" ]]; then
    echo "[ERROR] MSSQL_SA_PASSWORD env dosyasında bulunamadı."
    exit 1
fi

# Parolayı sqlcmd'e ortam değişkeniyle geçiyoruz; -P bayrağı komut satırında
# kalsaydı parola host'ta ve container'da `ps` çıktısında görünürdü.
# `docker exec -e SQLCMDPASSWORD` (değersiz form) değeri bu kabuktan devralır.
export SQLCMDPASSWORD="${SA_PASSWORD}"

# Yedek dosyası belirtilmemişse en son yedeği bul.
# Arama uygulama veritabanının adıyla sınırlı: backup-db.sh aynı dizine birden
# fazla veritabanının yedeğini yazıyor (ör. test'te DIVIZYON). Filtresiz arama,
# başka bir veritabanının yedeğini doğrulayıp uygulama yedeği sağlıklıymış gibi
# rapor verebilirdi. Başka bir .bak'ı doğrulamak için dosya yolu argümanı verilir.
if [[ -z "${BACKUP_FILE}" ]]; then
    BACKUP_FILE=$(find "${BACKUP_DIR}" -name "${DATABASE}_*.bak" -printf '%T@ %p\n' 2>/dev/null \
        | sort -n | tail -1 | cut -d' ' -f2-)
    if [[ -z "${BACKUP_FILE}" ]]; then
        echo "[ERROR] ${BACKUP_DIR} dizininde ${DATABASE} yedeği bulunamadı."
        exit 1
    fi
    echo "[$(date)] En son yedek seçildi: ${BACKUP_FILE}"
fi

if [[ ! -f "${BACKUP_FILE}" ]]; then
    echo "[ERROR] Yedek dosyası bulunamadı: ${BACKUP_FILE}"
    exit 1
fi

FILENAME=$(basename "${BACKUP_FILE}")
BACKUP_SIZE=$(du -sh "${BACKUP_FILE}" | cut -f1)

echo "[$(date)] Yedek doğrulaması başlatılıyor"
echo "[$(date)] Dosya : ${BACKUP_FILE} (${BACKUP_SIZE})"

# Yedek dosyasını container'a kopyala
echo "[$(date)] Yedek dosyası container'a kopyalanıyor..."
docker exec "${CONTAINER}" mkdir -p /var/opt/mssql/restore
docker cp "${BACKUP_FILE}" "${CONTAINER}:/var/opt/mssql/restore/${FILENAME}"

# Temizlik: her durumda container'daki geçici dosyayı sil
cleanup() {
    docker exec "${CONTAINER}" rm -f "/var/opt/mssql/restore/${FILENAME}" 2>/dev/null || true
}
trap cleanup EXIT

# RESTORE VERIFYONLY: veritabanına dokunmadan backup'ın okunabilirliğini doğrular.
# WITH CHECKSUM sayfa checksum'larını da doğrular; bozuk yedek burada yakalanır.
verify_only() {
    docker exec -e SQLCMDPASSWORD "${CONTAINER}" \
        /opt/mssql-tools18/bin/sqlcmd \
        -S localhost -U sa -C \
        -Q "RESTORE VERIFYONLY FROM DISK = N'/var/opt/mssql/restore/${FILENAME}'${1};" \
        2>&1
}

echo "[$(date)] RESTORE VERIFYONLY çalıştırılıyor..."
VERIFY_OUTPUT=$(verify_only " WITH CHECKSUM")

# backup-db.sh'a CHECKSUM eklenmeden önce alınmış yedeklerde checksum bilgisi yoktur.
# Bunu "bozuk yedek" saymak yanlış alarm olur; checksum'suz doğrulamaya düşüp uyarıyoruz.
if echo "${VERIFY_OUTPUT}" | grep -qi "does not contain checksum"; then
    echo "[WARN] Yedekte checksum bilgisi yok (CHECKSUM öncesi alınmış)."
    echo "[WARN] Checksum'suz doğrulamaya düşülüyor — sayfa bozulması tespit edilemez."
    VERIFY_OUTPUT=$(verify_only "")
fi

if echo "${VERIFY_OUTPUT}" | grep -qi "error\|hata\|fail"; then
    echo "[ERROR] Yedek doğrulaması başarısız:"
    echo "${VERIFY_OUTPUT}"
    exit 1
fi

# Yedek içerik bilgisini al (database adı, tarih, boyut)
echo "[$(date)] Yedek içeriği okunuyor..."
HEADER=$(docker exec -e SQLCMDPASSWORD "${CONTAINER}" \
    /opt/mssql-tools18/bin/sqlcmd \
    -S localhost -U sa -C \
    -Q "RESTORE HEADERONLY FROM DISK = N'/var/opt/mssql/restore/${FILENAME}';" \
    2>/dev/null | head -3 || true)

echo ""
echo "[$(date)] Yedek doğrulaması başarılı"
echo "[$(date)]   Dosya   : ${BACKUP_FILE}"
echo "[$(date)]   Boyut   : ${BACKUP_SIZE}"
echo "[$(date)]   Ortam   : ${ENVIRONMENT}"
echo ""
