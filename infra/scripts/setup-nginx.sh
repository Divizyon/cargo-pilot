#!/bin/bash
# ============================================================
# Cargo Pilot — Nginx Kurulum Scripti
#
# Kullanım:
#   sudo bash infra/scripts/setup-nginx.sh <test|prod> --domain <domain> [--dry-run]
#
# Örnek:
#   sudo bash infra/scripts/setup-nginx.sh test --domain cargopilot.divizyon.org
#   sudo bash infra/scripts/setup-nginx.sh prod --domain app.musteri.com
#   sudo bash infra/scripts/setup-nginx.sh prod --domain app.musteri.com --dry-run
#
# Akış (D-48): config geçici bir dizine render edilir → izole bir nginx
# instance'ı ile `nginx -t -c` doğrulanır → YALNIZCA geçerse canlı yola
# kopyalanır → canlı ağaçta tekrar `nginx -t` → başarısızsa yedekten geri
# alınır → ancak başarılıysa reload/restart edilir. Bozuk bir config asla
# /etc/nginx altına yazılmaz.
#
# Ortam değişkeni ile geçersiz kılınabilir (varsayılanlar prod sunucu içindir;
# sandbox/test için bu değişkenler geçici bir dizine yönlendirilebilir):
#   REPO_DIR, SSL_DIR, NGINX_SITES_AVAILABLE, NGINX_SITES_ENABLED,
#   NGINX_CONF_DEST, SERVICE_MANAGER, DOMAIN
# ============================================================
set -euo pipefail

DOMAIN_PLACEHOLDER="<YOUR_DOMAIN>"
SITE_NAME="cargopilot"

REPO_DIR="${REPO_DIR:-/opt/cargo-pilot}"
SSL_DIR="${SSL_DIR:-/etc/nginx/ssl}"
NGINX_SITES_AVAILABLE="${NGINX_SITES_AVAILABLE:-/etc/nginx/sites-available}"
NGINX_SITES_ENABLED="${NGINX_SITES_ENABLED:-/etc/nginx/sites-enabled}"
NGINX_CONF_DEST="${NGINX_CONF_DEST:-${NGINX_SITES_AVAILABLE}/${SITE_NAME}}"
SERVICE_MANAGER="${SERVICE_MANAGER:-systemctl}"

DOMAIN="${DOMAIN:-}"
ENVIRONMENT=""
DRY_RUN=0
WORK_DIR=""

die() {
    echo "HATA: $*" >&2
    exit 1
}

usage() {
    cat >&2 <<EOF
Kullanım: sudo bash infra/scripts/setup-nginx.sh <test|prod> --domain <domain> [--dry-run]

  <test|prod>        Kurulacak ortam. infra/nginx/${SITE_NAME}-<ortam>.conf kullanılır.
  --domain <domain>  Sertifika CN'i ve conf içindeki ${DOMAIN_PLACEHOLDER} yerine yazılacak domain.
                     DOMAIN ortam değişkeni ile de verilebilir.
  --dry-run          Yalnızca render + doğrulama yapar; /etc/nginx altına dokunmaz.
EOF
    exit 2
}

cleanup() {
    if [ -n "${WORK_DIR}" ] && [ -d "${WORK_DIR}" ]; then
        rm -rf "${WORK_DIR}"
    fi
}
trap cleanup EXIT

# ── Argümanlar ────────────────────────────────────────────
while [ $# -gt 0 ]; do
    case "$1" in
        test|prod)
            [ -n "${ENVIRONMENT}" ] && die "Ortam iki kez verildi: ${ENVIRONMENT} / $1"
            ENVIRONMENT="$1"
            shift
            ;;
        --domain)
            [ $# -ge 2 ] || die "--domain bir değer bekliyor."
            DOMAIN="$2"
            shift 2
            ;;
        --domain=*)
            DOMAIN="${1#--domain=}"
            shift
            ;;
        --dry-run)
            DRY_RUN=1
            shift
            ;;
        -h|--help)
            usage
            ;;
        *)
            echo "Bilinmeyen argüman: $1" >&2
            usage
            ;;
    esac
done

[ -n "${ENVIRONMENT}" ] || { echo "Ortam belirtilmedi (test|prod)." >&2; usage; }
[ -n "${DOMAIN}" ] || { echo "Domain belirtilmedi (--domain ya da DOMAIN)." >&2; usage; }

case "${DOMAIN}" in
    *[!a-zA-Z0-9.-]*|-*|.*|"")
        die "Geçersiz domain: '${DOMAIN}' (yalnız harf, rakam, '.' ve '-')."
        ;;
esac

NGINX_CONF_SRC="${NGINX_CONF_SRC:-${REPO_DIR}/infra/nginx/${SITE_NAME}-${ENVIRONMENT}.conf}"
[ -f "${NGINX_CONF_SRC}" ] || die "Kaynak conf bulunamadı: ${NGINX_CONF_SRC}"

echo "======================================================"
echo " Cargo Pilot Nginx Kurulumu"
echo " Ortam  : ${ENVIRONMENT}"
echo " Domain : ${DOMAIN}"
echo " Kaynak : ${NGINX_CONF_SRC}"
echo " Hedef  : ${NGINX_CONF_DEST}"
[ "${DRY_RUN}" -eq 1 ] && echo " Mod    : DRY-RUN (canlı config değiştirilmez)"
echo "======================================================"

# ── 1. Nginx kurulumu ─────────────────────────────────────
echo ""
echo "==> [1/6] Nginx kontrol ediliyor..."
if ! command -v nginx >/dev/null 2>&1; then
    if [ "${DRY_RUN}" -eq 1 ]; then
        die "Nginx kurulu değil; --dry-run modunda kurulum yapılmaz."
    fi
    echo "    Nginx bulunamadı, kuruluyor..."
    apt-get update -qq && apt-get install -y nginx
    echo "    Nginx kuruldu."
else
    echo "    Nginx zaten kurulu: $(nginx -v 2>&1)"
fi

# ── 2. Config render + placeholder ikamesi ────────────────
echo ""
echo "==> [2/6] Config render ediliyor (placeholder ikamesi)..."
WORK_DIR="$(mktemp -d)"
CANDIDATE="${WORK_DIR}/${SITE_NAME}.conf"

# <YOUR_DOMAIN> → gerçek domain. Nginx bu placeholder'ı sözdizimsel olarak
# geçerli bir server_name kabul ettiği için `nginx -t` yakalamaz; ikame
# edilmezse 443'teki tek server bloğu olarak trafiği yine karşılar (sessiz
# yanlış yapılandırma). Bu yüzden ikame sonrası kalan placeholder ölümcül hata.
sed "s|${DOMAIN_PLACEHOLDER}|${DOMAIN}|g" "${NGINX_CONF_SRC}" >"${CANDIDATE}"

if grep -n '<[A-Za-z0-9_]\+>' "${CANDIDATE}" >"${WORK_DIR}/leftover.txt"; then
    echo "    İkame edilmemiş placeholder bulundu:" >&2
    sed 's/^/      /' "${WORK_DIR}/leftover.txt" >&2
    die "Conf içinde doldurulmamış placeholder var; kurulum durduruldu."
fi

# server_name gerçekten istenen domain mi? (test conf'unda domain sabit yazılı;
# yanlış ortam/domain kombinasyonu sessizce geçmesin.)
CONF_SERVER_NAMES="$(
    grep -E '^[[:space:]]*server_name[[:space:]]' "${CANDIDATE}" |
        sed -E 's/^[[:space:]]*server_name[[:space:]]+//; s/;[[:space:]]*$//' |
        tr -s ' ' '\n' | sort -u
)"
[ -n "${CONF_SERVER_NAMES}" ] || die "Conf içinde server_name bulunamadı: ${NGINX_CONF_SRC}"

while IFS= read -r name; do
    [ -z "${name}" ] && continue
    [ "${name}" = "${DOMAIN}" ] && continue
    die "Conf'taki server_name '${name}' verilen domain '${DOMAIN}' ile uyuşmuyor (${NGINX_CONF_SRC})."
done <<EOF
${CONF_SERVER_NAMES}
EOF
echo "    Placeholder ikamesi tamam; server_name = ${DOMAIN}"

# ── 3. SSL sertifikası ────────────────────────────────────
echo ""
echo "==> [3/6] SSL sertifikası kontrol ediliyor..."
CERT_PATH="$(grep -E '^[[:space:]]*ssl_certificate[[:space:]]' "${CANDIDATE}" |
    head -n1 | sed -E 's/^[[:space:]]*ssl_certificate[[:space:]]+//; s/;[[:space:]]*$//')"
KEY_PATH="$(grep -E '^[[:space:]]*ssl_certificate_key[[:space:]]' "${CANDIDATE}" |
    head -n1 | sed -E 's/^[[:space:]]*ssl_certificate_key[[:space:]]+//; s/;[[:space:]]*$//')"
[ -n "${CERT_PATH}" ] && [ -n "${KEY_PATH}" ] || die "Conf içinde ssl_certificate / ssl_certificate_key bulunamadı."
echo "    Conf'un beklediği sertifika: ${CERT_PATH}"

if [ -f "${CERT_PATH}" ] && [ -f "${KEY_PATH}" ]; then
    echo "    Sertifika zaten mevcut, atlanıyor."
    echo "    Yenilemek için: rm ${CERT_PATH} ${KEY_PATH}"
elif [ "${CERT_PATH#"${SSL_DIR}"/}" != "${CERT_PATH}" ]; then
    mkdir -p "${SSL_DIR}"
    openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
        -keyout "${KEY_PATH}" \
        -out "${CERT_PATH}" \
        -subj "/CN=${DOMAIN}" 2>/dev/null
    chmod 600 "${KEY_PATH}"
    echo "    Self-signed sertifika oluşturuldu (10 yıl geçerli)."
    if [ "${ENVIRONMENT}" = "prod" ]; then
        echo "    UYARI: prod ortamında self-signed sertifika üretildi."
        echo "    Gerçek bir CA sertifikası ile değiştirilmeli (${CERT_PATH})."
    else
        echo "    Cloudflare Full SSL modu ile uyumlu."
    fi
else
    die "Sertifika yok ve yolu ${SSL_DIR} altında değil: ${CERT_PATH} — elle kurulmalı."
fi

# ── 4. İzole doğrulama (kopyalamadan ÖNCE) ────────────────
echo ""
echo "==> [4/6] Config izole bir nginx instance'ı ile doğrulanıyor..."
TEST_ROOT="${WORK_DIR}/nginx-test"
mkdir -p "${TEST_ROOT}/logs"
cat >"${TEST_ROOT}/nginx.conf" <<EOF
worker_processes 1;
error_log stderr warn;
pid ${TEST_ROOT}/nginx.pid;
events { worker_connections 64; }
http {
    include ${CANDIDATE};
}
EOF

if ! nginx -t -p "${TEST_ROOT}" -c "${TEST_ROOT}/nginx.conf"; then
    die "Config doğrulaması başarısız — canlı config'e DOKUNULMADI (${NGINX_CONF_DEST} değişmedi)."
fi
echo "    Config geçerli."

if [ "${DRY_RUN}" -eq 1 ]; then
    echo ""
    echo "======================================================"
    echo " DRY-RUN tamamlandı: config geçerli, hiçbir şey kopyalanmadı."
    echo "======================================================"
    exit 0
fi

# ── 5. Canlı yola kopyalama + canlı ağaçta doğrulama ──────
echo ""
echo "==> [5/6] Config canlı yola kopyalanıyor..."
mkdir -p "${NGINX_SITES_AVAILABLE}" "${NGINX_SITES_ENABLED}"

BACKUP_PATH=""
if [ -f "${NGINX_CONF_DEST}" ]; then
    BACKUP_PATH="${NGINX_CONF_DEST}.bak.$(date +%Y%m%d%H%M%S)"
    cp -p "${NGINX_CONF_DEST}" "${BACKUP_PATH}"
    echo "    Mevcut config yedeklendi: ${BACKUP_PATH}"
fi

DEFAULT_SITE_LINK="${NGINX_SITES_ENABLED}/default"
DEFAULT_SITE_TARGET=""
if [ -e "${DEFAULT_SITE_LINK}" ]; then
    DEFAULT_SITE_TARGET="$(readlink "${DEFAULT_SITE_LINK}" || true)"
fi

rollback() {
    echo "    Geri alınıyor..." >&2
    if [ -n "${BACKUP_PATH}" ]; then
        cp -p "${BACKUP_PATH}" "${NGINX_CONF_DEST}"
        echo "    Önceki config geri yüklendi: ${NGINX_CONF_DEST}" >&2
    else
        rm -f "${NGINX_CONF_DEST}" "${NGINX_SITES_ENABLED}/${SITE_NAME}"
        echo "    Yeni eklenen config ve symlink kaldırıldı." >&2
    fi
    if [ -n "${DEFAULT_SITE_TARGET}" ] && [ ! -e "${DEFAULT_SITE_LINK}" ]; then
        ln -sf "${DEFAULT_SITE_TARGET}" "${DEFAULT_SITE_LINK}"
        echo "    Default site symlink'i geri konuldu." >&2
    fi
}

cp "${CANDIDATE}" "${NGINX_CONF_DEST}"
ln -sf "${NGINX_CONF_DEST}" "${NGINX_SITES_ENABLED}/${SITE_NAME}"
echo "    Config kopyalandı: ${NGINX_CONF_DEST}"

# Default site'ı devre dışı bırak (port 80 çakışması önleme)
if [ -e "${DEFAULT_SITE_LINK}" ]; then
    rm -f "${DEFAULT_SITE_LINK}"
    echo "    Default site devre dışı bırakıldı."
fi

echo "    Canlı ağaçta nginx -t..."
if ! nginx -t; then
    rollback
    die "Canlı ağaçta nginx -t başarısız oldu; değişiklikler geri alındı ve reload yapılmadı."
fi
echo "    Canlı config geçerli."

# ── 6. UFW + nginx reload ─────────────────────────────────
echo ""
echo "==> [6/6] UFW ve nginx..."
if command -v ufw >/dev/null 2>&1; then
    # UFW pasif olabilir; bu bir hata değil, script `set -e` altında ölmemeli.
    if ufw allow 443/tcp; then
        echo "    UFW 443/tcp kuralı uygulandı."
    else
        echo "    UYARI: 'ufw allow 443/tcp' başarısız oldu, atlanıyor."
    fi
    UFW_STATUS="$(ufw status 2>/dev/null || true)"
    if printf '%s\n' "${UFW_STATUS}" | grep -q '443'; then
        printf '%s\n' "${UFW_STATUS}" | grep '443' | sed 's/^/    /'
    else
        echo "    UFW çıktısında 443 kaydı görünmüyor (UFW pasif olabilir)."
    fi
else
    echo "    UFW bulunamadı, atlanıyor."
fi

if "${SERVICE_MANAGER}" is-active --quiet nginx; then
    echo "    Nginx çalışıyor, reload ediliyor..."
    "${SERVICE_MANAGER}" reload nginx
else
    echo "    Nginx çalışmıyor, başlatılıyor..."
    "${SERVICE_MANAGER}" restart nginx
fi
"${SERVICE_MANAGER}" enable nginx

echo ""
echo "======================================================"
echo " Nginx kurulumu tamamlandı! (${ENVIRONMENT} / ${DOMAIN})"
echo "======================================================"
echo ""
echo " Sonraki adım — Frontend'i yeniden build et:"
echo ""
echo "   cd ${REPO_DIR}"
echo "   # infra/env/.env.${ENVIRONMENT} dosyasına şu satırı ekle/güncelle:"
echo "   #   VITE_API_BASE_URL=https://${DOMAIN}"
echo ""
echo "   docker compose \\"
echo "     -f infra/compose/docker-compose.${ENVIRONMENT}.yml \\"
echo "     --env-file infra/env/.env.${ENVIRONMENT} \\"
echo "     build --no-cache frontend"
echo ""
echo "   docker compose \\"
echo "     -f infra/compose/docker-compose.${ENVIRONMENT}.yml \\"
echo "     --env-file infra/env/.env.${ENVIRONMENT} \\"
echo "     up -d --no-build frontend"
echo ""
echo " Test:"
echo "   curl -I https://${DOMAIN}"
echo "   curl -sf https://${DOMAIN}/health"
echo "======================================================"
