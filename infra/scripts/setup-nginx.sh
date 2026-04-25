#!/bin/bash
# ============================================================
# Cargo Pilot — Nginx Kurulum Scripti
# Kullanım: sudo bash infra/scripts/setup-nginx.sh
# Gereksinim: /opt/cargo-pilot klasöründe çalıştırılmalı
# ============================================================
set -e

DOMAIN="cargopilot.divizyon.org"
REPO_DIR="/opt/cargo-pilot"
SSL_DIR="/etc/nginx/ssl"
NGINX_CONF_SRC="${REPO_DIR}/infra/nginx/cargopilot-test.conf"
NGINX_CONF_DEST="/etc/nginx/sites-available/cargopilot"

echo "======================================================"
echo " Cargo Pilot Nginx Kurulumu"
echo " Domain : ${DOMAIN}"
echo "======================================================"

# ── 1. Nginx kurulumu ─────────────────────────────────────
echo ""
echo "==> [1/5] Nginx kontrol ediliyor..."
if ! command -v nginx &>/dev/null; then
    echo "    Nginx bulunamadı, kuruluyor..."
    apt-get update -qq && apt-get install -y nginx
    echo "    Nginx kuruldu."
else
    echo "    Nginx zaten kurulu: $(nginx -v 2>&1)"
fi

# ── 2. SSL sertifikası ────────────────────────────────────
echo ""
echo "==> [2/5] SSL sertifikası oluşturuluyor..."
mkdir -p "${SSL_DIR}"

if [ -f "${SSL_DIR}/cargopilot.crt" ]; then
    echo "    Sertifika zaten mevcut, atlanıyor."
    echo "    Yenilemek için: rm ${SSL_DIR}/cargopilot.crt ${SSL_DIR}/cargopilot.key"
else
    openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
        -keyout "${SSL_DIR}/cargopilot.key" \
        -out "${SSL_DIR}/cargopilot.crt" \
        -subj "/CN=${DOMAIN}" 2>/dev/null
    chmod 600 "${SSL_DIR}/cargopilot.key"
    echo "    Self-signed sertifika oluşturuldu (10 yıl geçerli)."
    echo "    Cloudflare Full SSL modu ile uyumlu."
fi

# ── 3. Nginx config ───────────────────────────────────────
echo ""
echo "==> [3/5] Nginx konfigürasyonu kopyalanıyor..."
cp "${NGINX_CONF_SRC}" "${NGINX_CONF_DEST}"
ln -sf "${NGINX_CONF_DEST}" /etc/nginx/sites-enabled/cargopilot

# Default site'ı devre dışı bırak (port 80 çakışması önleme)
if [ -f /etc/nginx/sites-enabled/default ]; then
    rm -f /etc/nginx/sites-enabled/default
    echo "    Default site devre dışı bırakıldı."
fi

echo "    Config kopyalandı: ${NGINX_CONF_DEST}"

echo ""
echo "==> [3.5] Nginx config test ediliyor..."
nginx -t

# ── 4. UFW ───────────────────────────────────────────────
echo ""
echo "==> [4/5] UFW port 443 açılıyor..."
if command -v ufw &>/dev/null; then
    ufw allow 443/tcp
    ufw status | grep 443
else
    echo "    UFW bulunamadı, atlanıyor."
fi

# ── 5. Nginx başlatma ────────────────────────────────────
echo ""
echo "==> [5/5] Nginx yeniden başlatılıyor..."
systemctl restart nginx
systemctl enable nginx

echo ""
echo "======================================================"
echo " ✅ Nginx kurulumu tamamlandı!"
echo "======================================================"
echo ""
echo " Sonraki adım — Frontend'i yeniden build et:"
echo ""
echo "   cd ${REPO_DIR}"
echo "   # .env.test dosyasına şu satırı ekle/güncelle:"
echo "   #   VITE_API_BASE_URL=https://${DOMAIN}"
echo ""
echo "   docker compose \\"
echo "     -f infra/compose/docker-compose.test.yml \\"
echo "     --env-file infra/env/.env.test \\"
echo "     build --no-cache frontend"
echo ""
echo "   docker compose \\"
echo "     -f infra/compose/docker-compose.test.yml \\"
echo "     --env-file infra/env/.env.test \\"
echo "     up -d --no-build frontend"
echo ""
echo " Test:"
echo "   curl -I https://${DOMAIN}"
echo "   curl -sf https://${DOMAIN}/health"
echo "======================================================"
