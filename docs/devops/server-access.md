# Sunucu Erişim ve Ağ Yapılandırması

**Görev:** US-D02-I  
**Tarih:** 2026-04-23  
**Durum:** Tamamlandı

---

## 1. Sunucu Bilgileri

| Özellik | Değer |
|---------|-------|
| IP | `104.247.163.42` |
| FQDN | `cargopilot.divizyon.org` |
| OS | Ubuntu 24.04.4 LTS |
| SSH Port | 22 |

---

## 2. SSH Erişimi

### Güvenlik Ayarları
- `PermitRootLogin prohibit-password` — root şifre girişi kapalı, yalnızca key ile giriş
- `PubkeyAuthentication yes` — key tabanlı kimlik doğrulama aktif
- `MaxAuthTries 3` — maksimum 3 deneme

### Yetkili SSH Key'ler

| Key Adı | Kullanım |
|---------|---------|
| `github-actions-prod-deploy` | GitHub Actions CI/CD otomatik deploy |
| `dogancanyildiz-cargo-pilot` | Doğancan Yıldız – geliştirici erişimi |
| `hturk-cargo-pilot` | Hasan Türk – geliştirici erişimi |

### Key ile Bağlantı
```bash
ssh -i ~/.ssh/cargo-pilot-server root@104.247.163.42
```

### Yeni Geliştirici Ekleme
```bash
# Sunucuda çalıştır:
echo "ssh-ed25519 AAAA... isim-cargo-pilot" >> ~/.ssh/authorized_keys
```

---

## 3. Güvenlik Duvarı (UFW)

**Durum:** Aktif — `deny incoming` varsayılan

| Port | Protokol | Servis | Açıklama |
|------|----------|--------|---------|
| 22 | TCP | SSH | Tüm erişim (fail2ban korumalı) |
| 80 | TCP | Frontend Prod | HTTP |
| 8080 | TCP | Backend API Prod | REST API |
| 3001 | TCP | Frontend Test | Test ortamı |
| 8081 | TCP | Backend API Test | Test REST API |
| 9000 | TCP | MinIO Prod API | S3-compatible storage |
| 9001 | TCP | MinIO Prod Console | Yönetim paneli |
| 9002 | TCP | MinIO Test API | Test storage |
| 9003 | TCP | MinIO Test Console | Test yönetim |
| 1433 | TCP | MSSQL Prod | Development erişimi için açık |
| 1434 | TCP | MSSQL Test | Development erişimi için açık |

> **Not:** MSSQL portları (1433/1434) geliştirici erişimi için açık tutulmaktadır.
> Production'da bu portlara erişimi IP kısıtlaması ile sınırlandırmak önerilir.

---

## 4. fail2ban (Brute Force Koruması)

**Durum:** Aktif

| Parametre | Değer |
|-----------|-------|
| `maxretry` | 5 deneme |
| `findtime` | 10 dakika |
| `bantime` | 1 saat |
| Korunan servis | SSH (port 22) |

```bash
# Ban durumunu görüntüle
fail2ban-client status sshd

# IP'yi unban et
fail2ban-client set sshd unbanip <IP>
```

---

## 5. Ağ Yapısı

```
İnternet
    │
    ▼
104.247.163.42 (eth0)
    │
    ├── UFW (deny incoming by default)
    │       └── İzin verilen portlar → Servislere yönlendirme
    │
    ├── Docker bridge ağları
    │       ├── cargo-pilot-prod-network   (prod stack)
    │       └── cargo-pilot-test-network   (test stack)
    │
    └── fail2ban → SSH brute force koruması
```

---

## 6. GitHub Actions Deploy Key

CI/CD pipeline'ı sunucuya `github-actions-prod-deploy` key'i ile bağlanır.  
GitHub repository → Settings → Secrets'ta saklanır:
- `SSH_HOST`: `104.247.163.42`
- `SSH_PRIVATE_KEY`: github-actions key'inin private kısmı
