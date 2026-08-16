#!/usr/bin/env bash
# restore-db.sh — MSSQL veritabanını .bak dosyasından geri yükler.
#
# Kullanım:
#   ./restore-db.sh [ortam] [yedek-dosyası]
#
#   ortam        : prod | test (varsayılan: prod)
#   yedek-dosyası: tam yol (belirtilmezse en son yedek kullanılır)
#
# Örnekler:
#   ./restore-db.sh prod
#   ./restore-db.sh prod /opt/cargo-pilot/backups/mssql/prod/CargoPilot_20240101_020000.bak
#   ./restore-db.sh test /opt/cargo-pilot/backups/mssql/test/CargoPilotTest_20240101_030000.bak

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

# Yedek dosyası belirtilmemişse en son yedeği bul
if [[ -z "${BACKUP_FILE}" ]]; then
    BACKUP_FILE=$(find "${BACKUP_DIR}" -name "*.bak" -printf '%T@ %p\n' 2>/dev/null \
        | sort -n | tail -1 | cut -d' ' -f2-)
    if [[ -z "${BACKUP_FILE}" ]]; then
        echo "[ERROR] ${BACKUP_DIR} dizininde yedek dosyası bulunamadı."
        exit 1
    fi
    echo "[$(date)] En son yedek seçildi: ${BACKUP_FILE}"
fi

# Yedek dosyası var mı?
if [[ ! -f "${BACKUP_FILE}" ]]; then
    echo "[ERROR] Yedek dosyası bulunamadı: ${BACKUP_FILE}"
    exit 1
fi

FILENAME=$(basename "${BACKUP_FILE}")

echo "[$(date)] Geri yükleme başlatılıyor: ${BACKUP_FILE} → ${DATABASE}"
echo "[$(date)] Container: ${CONTAINER}"

# Prod ortamında onay iste
if [[ "${ENVIRONMENT}" == "prod" ]]; then
    echo ""
    echo "UYARI: Bu işlem production veritabanını geri yükleyecek!"
    echo "Mevcut prod verisi üzerine yazılacak. Devam etmek istiyor musunuz? (yes/NO)"
    read -r CONFIRM
    if [[ "${CONFIRM}" != "yes" ]]; then
        echo "İptal edildi."
        exit 0
    fi
fi

# Geri yükleme öncesi mevcut durumu kaydet
echo "[$(date)] Mevcut tablo sayısı kontrol ediliyor..."
BEFORE_COUNT=$(docker exec -e SQLCMDPASSWORD "${CONTAINER}" \
    /opt/mssql-tools18/bin/sqlcmd \
    -S localhost -U sa -C \
    -Q "SET NOCOUNT ON; SELECT COUNT(*) FROM [${DATABASE}].INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE';" \
    -h -1 2>/dev/null | tr -d ' \r\n' || echo "0")
echo "[$(date)] Geri yüklemeden önce tablo sayısı: ${BEFORE_COUNT}"

# Yedek dosyasını container'a kopyala
echo "[$(date)] Yedek dosyası container'a kopyalanıyor..."
docker exec "${CONTAINER}" mkdir -p /var/opt/mssql/restore
docker cp "${BACKUP_FILE}" "${CONTAINER}:/var/opt/mssql/restore/${FILENAME}"

# RESTORE DATABASE
echo "[$(date)] Veritabanı geri yükleniyor (bu işlem birkaç dakika sürebilir)..."
docker exec -e SQLCMDPASSWORD "${CONTAINER}" \
    /opt/mssql-tools18/bin/sqlcmd \
    -S localhost -U sa -C \
    -Q "
ALTER DATABASE [${DATABASE}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
RESTORE DATABASE [${DATABASE}]
    FROM DISK = N'/var/opt/mssql/restore/${FILENAME}'
    WITH REPLACE, STATS=10;
ALTER DATABASE [${DATABASE}] SET MULTI_USER;
"

# Container içindeki geçici dosyayı temizle
echo "[$(date)] Geçici dosya temizleniyor..."
docker exec "${CONTAINER}" rm -f "/var/opt/mssql/restore/${FILENAME}"

# Doğrulama: Tablo sayısını kontrol et
echo "[$(date)] Geri yükleme doğrulanıyor..."
AFTER_COUNT=$(docker exec -e SQLCMDPASSWORD "${CONTAINER}" \
    /opt/mssql-tools18/bin/sqlcmd \
    -S localhost -U sa -C \
    -Q "SET NOCOUNT ON; SELECT COUNT(*) FROM [${DATABASE}].INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE';" \
    -h -1 2>/dev/null | tr -d ' \r\n')

if [[ -z "${AFTER_COUNT}" || "${AFTER_COUNT}" -eq 0 ]]; then
    echo "[ERROR] Doğrulama başarısız: Restore sonrası tablo bulunamadı."
    exit 1
fi

echo "[$(date)] Geri yükleme başarılı — ${DATABASE} (${AFTER_COUNT} tablo)"
echo "[$(date)] Yedek dosyası: ${BACKUP_FILE}"
