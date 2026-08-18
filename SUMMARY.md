# Table of Contents

* [🏠 Ana Sayfa](README.md)

## 🚀 Başlangıç

* [Local Setup](docs/setup/local-setup.md)
* [Katkı Sağlama](CONTRIBUTING.md)
* [Ortam Değişkenleri (infra)](infra/env/README.md)

## 📋 Geliştirme Kuralları

* [Branch Stratejisi](docs/conventions/branching.md)
* [Commit Kuralları](docs/conventions/commits.md)
* [Koordinat Sistemi Standardı](docs/COORDINATE_STANDARD.md)
* [Koordinat Uyum Raporu](docs/KOORDINAT-UYUM-RAPORU.md)
* [ADR Kuralı](docs/conventions/adr.md)

## 📐 Mimari Kararlar (ADR)

* [ADR İndeksi ve Kuralları](docs/adr/README.md)
* [ADR Şablonu](docs/adr/ADR-0000-sablon.md)
* [ADR-0001 — ERP Bağlantı Mimarisi](docs/adr/ADR-0001-erp-baglanti-mimarisi.md)
* [ADR-0002 — Optimizasyon Motorunun Modülerleştirilmesi](docs/adr/ADR-0002-optimizasyon-motoru-modulerlestirme.md)
* [ADR-0003 — LIFO Bölge Kısıtı](docs/adr/ADR-0003-lifo-bolge-sert-kisiti.md)
* [ADR-0004 — Denge Takasında Çift Yönlü Doğrulama](docs/adr/ADR-0004-denge-takasi-cift-yonlu-dogrulama.md)
* [ADR-0005 — Modül Bayraklarının Dışa Kapalılığı](docs/adr/ADR-0005-modul-bayraklari-disa-kapali.md)
* [ADR-0006 — Üç Dallı Terfi Modeli](docs/adr/ADR-0006-uc-dalli-terfi-modeli.md)
* [ADR-0007 — Docker Build Cache Asimetrisi](docs/adr/ADR-0007-docker-build-cache-asimetrisi.md)
* [ADR-0008 — SHA Pinleme Sürüm Yükseltmesinden Ayrılır](docs/adr/ADR-0008-sha-pinleme-surum-yukseltmeden-ayri.md)
* [ADR-0009 — Otomatik Geri Alma Sessizce Başarılı Dönmez](docs/adr/ADR-0009-otomatik-geri-alma-sessizce-basarili-donmez.md)
* [ADR-0010 — Duvar Örücü ve Arama Katmanı](docs/adr/ADR-0010-duvar-orucu-ve-arama-katmani.md)

## 🛠️ DevOps

* [Deployment](docs/devops/deployment.md)
* [Sunucu Gereksinimleri](docs/devops/server-requirements.md)
* [Sunucu Erişim & Ağ](docs/devops/server-access.md)
* [Secret Yönetimi](docs/devops/secret-management.md)
* [Monitoring & Alerting](docs/devops/monitoring-setup.md)
* [Bilinen Sorunlar](docs/devops/known-issues.md)
* [DevOps Backlog](docs/devops/devops-backlog.md)
* [DevOps Denetim Raporu — 2026-08-13](docs/devops/denetim-raporu-2026-08-13.md)
* [Güvenlik Politikası](.github/SECURITY.md)

## 🧱 Backend

* [Mimari Rehberi](apps/backend/docs/architecture.md)
* [Developer Setup](apps/backend/docs/developer-setup.md)
* [Environment Variables](apps/backend/docs/environment-variables.md)
* [Database Migrations](apps/backend/docs/database-migrations.md)
* [User Story Tracker](apps/backend/docs/user-story-tracker.md)
* [ERP Veri Modeli](apps/backend/docs/erp-integration/data-model.md)
* [ERP Şeması — DIVIZYON](apps/backend/docs/erp-integration/erp-schema-divizyon.md)

## 🧮 Yükleme Algoritması

* [Algoritma Belgeleri — Dizin](docs/algorithm/README.md)
* [Sözlük](docs/algorithm/00-sozluk.md)
* [Kurallar (R-*)](docs/algorithm/01-kurallar.md)
* [Karar Kaydı (DR-*)](docs/algorithm/02-kararlar.md)
* [Yol Haritası](docs/algorithm/03-yol-haritasi.md)
* [Ölçüm Günlüğü](docs/algorithm/04-olcum-gunlugu.md)
* [Başarı Karnesi](docs/algorithm/05-basari-karnesi.md)
* [Araştırma — Brifing (2026-08-17)](docs/algorithm/arastirma/2026-08-17-brifing.md)
* [Araştırma — Ölü Hava Yanıtı (2026-08-17)](docs/algorithm/arastirma/2026-08-17-yanit-olu-hava.md)
* [Araştırma — Blok Arama Yanıtı (2026-08-18)](docs/algorithm/arastirma/2026-08-18-yanit-blok-arama.md)
* [Arşiv — Dizin](docs/algorithm/arsiv/README.md)
* [Arşiv — Sistem Mimarisi (2026-08-04)](docs/algorithm/arsiv/2026-08-04-sistem-mimarisi.md)
* [Arşiv — Matematiksel Model (2026-08-04)](docs/algorithm/arsiv/2026-08-04-matematiksel-model.md)
* [Arşiv — Uygulama Faz Planı (2026-08-04)](docs/algorithm/arsiv/2026-08-04-uygulama-faz-plani.md)
* [Arşiv — Mimari Raporu (2026-08-12)](docs/algorithm/arsiv/2026-08-12-mimari-raporu.md)
* [Arşiv — Adli İnceleme (2026-08-15)](docs/algorithm/arsiv/2026-08-15-adli-inceleme.md)
* [Arşiv — Rulebook Temel Raporu (2026-08-16)](docs/algorithm/arsiv/2026-08-16-temel-rapor.md)

## 🧭 Proje Bağlamı

* [Bağlam Kütüphanesi](docs/context/README.md)
* [Proje Anlık Görüntüsü](docs/context/project-snapshot.md)
* [Doküman Haritası](docs/context/doc-map.md)
* [Kod Taraması — Ağustos 2026](docs/context/kod-taramasi-2026-08.md)

## 🗄️ Arşiv

* [Denetim Test Planı — Ağustos 2026](docs/archive/audit-test-plani-2026-08.md)
* [Branch Stratejisi Önerisi — Ağustos 2026](docs/archive/branching-proposal-2026-08.md)
* [Branch & PR Denetimi — 2026-08-03](docs/archive/branch-denetimi-2026-08-03.md)
* [Koordinat Sistemi Denetimi — 2026-08-12](docs/archive/koordinat-denetimi-2026-08-12.md)
* [DevOps İyileştirme Analizi — 2026-08-03](docs/archive/devops-iyilestirme-analizi-2026-08.md)

