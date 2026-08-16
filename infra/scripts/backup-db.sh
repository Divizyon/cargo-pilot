#!/usr/bin/env bash
# backup-db.sh — MSSQL veritabanı yedeği alır ve eski yedekleri temizler.
#
# Kullanım:
#   ./backup-db.sh [ortam]        ortam: prod (varsayılan) | test
#
# Ortam başına birden fazla veritabanı yedeklenir (aşağıdaki DATABASES dizisi).
# Liste `BACKUP_DATABASES` ile ezilebilir (boşlukla ayrılmış):
#   BACKUP_DATABASES="CargoPilotTest MUSTERI_ERP" ./backup-db.sh test
#
# Cron örneği (her gece 02:00):
#   0 2 * * * /opt/cargo-pilot/infra/scripts/backup-db.sh prod >> /var/log/cargo-pilot/backup.log 2>&1

set -euo pipefail

# Yedek dosyalari tum musteri verisini icerir. Varsayilan umask ile dizin 755,
# .bak 644 olur; host'taki her kullanici okuyabilir. 077 ile bu script'in
# urettigi her sey sahibine ozel (dizin 700, dosya 600) yaratilir.
umask 077

ENVIRONMENT="${1:-prod}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/opt/cargo-pilot/backups/mssql/${ENVIRONMENT}"
RETENTION_DAYS=7

# Ortama göre değişkenler.
# DATABASES dizisinin İLK elemanı birincil (uygulama) veritabanıdır: yoksa hata,
# yedeklenemezse çıkış kodu 1. Sonraki elemanlar ek veritabanlarıdır; sunucuda
# yoklarsa uyarıyla atlanır — varlıkları ortama göre değişebilir, yokluğu
# uygulama yedeğini bloke etmemeli.
if [[ "${ENVIRONMENT}" == "prod" ]]; then
    CONTAINER="cargo-pilot-mssql-prod"
    ENV_FILE="/opt/cargo-pilot/infra/env/.env.prod"
    DATABASES=("CargoPilot")
elif [[ "${ENVIRONMENT}" == "test" ]]; then
    CONTAINER="cargo-pilot-mssql-test"
    ENV_FILE="/opt/cargo-pilot/infra/env/.env.test"
    # DIVIZYON: müşteri ERP veritabanı, 2026-05-16'da aynı container'a elle
    # restore edildi (docs/devops/server-access.md "ERP Veritabanı (DIVIZYON)").
    # Kaynağı bir .bak dosyası; yedeklenmezse geri getirilemez.
    DATABASES=("CargoPilotTest" "DIVIZYON")
else
    echo "[ERROR] Geçersiz ortam: ${ENVIRONMENT}. 'prod' veya 'test' kullanın."
    exit 1
fi

# Müşteri ERP veritabanının adı kuruluma göre değişir; listeyi dışarıdan ezmek
# için script'i düzenlemek gerekmesin.
if [[ -n "${BACKUP_DATABASES:-}" ]]; then
    read -r -a DATABASES <<< "${BACKUP_DATABASES}"
    echo "[$(date)] Veritabanı listesi BACKUP_DATABASES ile ezildi: ${DATABASES[*]}"
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

mkdir -p "${BACKUP_DIR}"
# umask yalnizca yeni yaratilanlari kapsar; onceki kosumlardan kalan gevsek
# izinli dizinleri de her calismada duzeltiyoruz.
chmod 700 "${BACKUP_DIR}"

# Veritabanı container'da var mı?
#   0 = var · 1 = yok · 2 = sorgulanamadı (container kapalı, parola yanlış vb.)
# "yok" ile "sorgulayamadım" ayrımı önemli: ikincisi sessizce atlanacak bir durum
# değil, hatadır.
db_exists() {
    local database="$1" answer
    answer=$(docker exec -e SQLCMDPASSWORD "${CONTAINER}" \
        /opt/mssql-tools18/bin/sqlcmd \
        -S localhost -U sa -C -h -1 \
        -Q "SET NOCOUNT ON; SELECT CASE WHEN DB_ID('${database}') IS NULL THEN 0 ELSE 1 END;" \
        2>/dev/null | tr -d ' \r\n' || true)
    case "${answer}" in
        1) return 0 ;;
        0) return 1 ;;
        *) return 2 ;;
    esac
}

# Tek bir veritabanının yedeğini alır. `set -e` fonksiyon koşul bağlamında
# çağrıldığında askıya alındığı için her kritik adım açıkça `|| return 1` ile
# korunur; aksi halde başarısız BACKUP'tan sonra kopyalamaya devam edilirdi.
backup_one() {
    local database="$1"
    local remote_file="/var/opt/mssql/backup/${database}_${TIMESTAMP}.bak"
    local backup_file="${BACKUP_DIR}/${database}_${TIMESTAMP}.bak"
    local backup_size

    echo "[$(date)] Yedek başlatılıyor: ${database} → ${backup_file}"

    # CHECKSUM: yedeğe sayfa checksum'ları yazar; verify-backup.sh bozulmayı bununla yakalar.
    docker exec -e SQLCMDPASSWORD "${CONTAINER}" \
        /opt/mssql-tools18/bin/sqlcmd \
        -S localhost -U sa -C \
        -Q "BACKUP DATABASE [${database}] TO DISK = N'${remote_file}' WITH NOFORMAT, INIT, CHECKSUM, STATS=10" \
        || { echo "[ERROR] BACKUP DATABASE başarısız: ${database}"; return 1; }

    # Container'dan host'a kopyala
    if ! docker cp "${CONTAINER}:${remote_file}" "${backup_file}"; then
        echo "[ERROR] Yedek host'a kopyalanamadı: ${database}"
        docker exec "${CONTAINER}" rm -f "${remote_file}" >/dev/null 2>&1 || true
        return 1
    fi
    # `docker cp` dosya iznini kaynaktan taşıyabilir; umask'e güvenmeyip açıkça daraltıyoruz.
    chmod 600 "${backup_file}"

    # Container içindeki geçici yedeği temizle
    docker exec "${CONTAINER}" rm -f "${remote_file}" || true

    backup_size=$(du -sh "${backup_file}" | cut -f1)
    echo "[$(date)] Yedek tamamlandı: ${backup_file} (${backup_size})"
}

# Container içinde yedek klasörünü hazırla
docker exec "${CONTAINER}" mkdir -p /var/opt/mssql/backup

SUCCEEDED=()
SKIPPED=()
FAILED=()

for index in "${!DATABASES[@]}"; do
    database="${DATABASES[${index}]}"

    exists_status=0
    db_exists "${database}" || exists_status=$?

    if [[ "${exists_status}" -eq 2 ]]; then
        echo "[ERROR] ${CONTAINER} sorgulanamadı (${database}). Container ayakta mı, parola doğru mu?"
        exit 1
    fi

    if [[ "${exists_status}" -eq 1 ]]; then
        if [[ "${index}" -eq 0 ]]; then
            # Birincil veritabanının yokluğu yapılandırma hatasıdır; sessizce geçilemez.
            echo "[ERROR] Birincil veritabanı ${CONTAINER} içinde bulunamadı: ${database}"
            exit 1
        fi
        echo "[WARN] Veritabanı ${CONTAINER} içinde yok, atlanıyor: ${database}"
        SKIPPED+=("${database}")
        continue
    fi

    if backup_one "${database}"; then
        SUCCEEDED+=("${database}")
    else
        FAILED+=("${database}")
    fi
done

echo "[$(date)] Özet — başarılı: ${#SUCCEEDED[@]} · atlanan: ${#SKIPPED[@]} · başarısız: ${#FAILED[@]}"
if [[ "${#SKIPPED[@]}" -gt 0 ]]; then
    echo "[$(date)]   Atlanan  : ${SKIPPED[*]}"
fi

# Eski yedekleri temizle
echo "[$(date)] ${RETENTION_DAYS} günden eski yedekler temizleniyor..."
find "${BACKUP_DIR}" -name "*.bak" -mtime +${RETENTION_DAYS} -delete
REMAINING=$(find "${BACKUP_DIR}" -name "*.bak" | wc -l)
echo "[$(date)] Kalan yedek sayısı: ${REMAINING}"

# Çıkış kodu en sonda veriliyor ki tek bir veritabanının hatası diğerlerinin
# yedeğini ve temizliği engellemesin. Kod yine de 1: cron log'u ve rollback.sh
# bu koda bakıyor, kısmi başarı "başarılı" sayılmamalı.
if [[ "${#FAILED[@]}" -gt 0 ]]; then
    echo "[ERROR] Yedeği alınamayan veritabanı(lar): ${FAILED[*]}"
    exit 1
fi
