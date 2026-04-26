import React, { useState, useRef } from "react";
import {
  Ruler,
  Weight,
  Hash,
  Eye,
  Grid3x3,
  Palette,
  FileSpreadsheet,
  FileText,
  QrCode,
  Link2,
  KeyRound,
  Archive,
  Layers,
  Crosshair,
  Scale,
  Download,
  Check,
  ChevronRight,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Settings {
  // 6.1
  olcuBirimi: "cm" | "mm";
  agirlikBirimi: "kg" | "ton";
  ondalikHassasiyet: "1" | "2" | "3";
  // 6.2
  kutupBilgisi: "sku" | "adet" | "gizle";
  hizalamaCizgisi: "belirgin" | "hafif" | "gizle";
  renkKodlamasi: "farkli" | "benzer";
  // 6.3
  raporBaslik: string;
  raporAltBilgi: string;
  qrKodAktif: boolean;
  veriDogrulama: "hata" | "uyari" | "pasif";
  birimSabitleme: "cm" | "mm";
  // 6.4
  excelEslestirme: boolean;
  apiAnahtari: string;
  arsivlemeSuresi: "3ay" | "6ay" | "1yil" | "2yil" | "suresiz";
  // 6.5
  istiflemeModu: "ust_uste" | "konulamaz";
  hataToleransi: string;
  agirlikMerkeziHedef: string;
}

// ─── Sub-nav sections ─────────────────────────────────────────────────────────

const sections = [
  { id: "bolgesel",       label: "Bölgesel ve Teknik",     short: "6.1" },
  { id: "gorsellestirme", label: "Görselleştirme",          short: "6.2" },
  { id: "raporlama",      label: "Raporlama ve Çıktı",      short: "6.3" },
  { id: "veri",           label: "Veri ve Entegrasyon",     short: "6.4" },
  { id: "algoritma",      label: "Algoritma Parametreleri", short: "6.5" },
];

// ─── Primitives ───────────────────────────────────────────────────────────────

function SectionCard({ id, title, description, children }: {
  id: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div id={id} className="bg-white rounded-2xl border border-zinc-200/80 overflow-hidden">
      <div className="px-6 py-4 border-b border-zinc-100">
        <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
        <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
      </div>
      <div className="divide-y divide-zinc-50">{children}</div>
    </div>
  );
}

function SettingRow({ label, description, children }: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="px-6 py-4 flex items-center gap-6">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-zinc-800">{label}</p>
        {description && <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Select({ value, onChange, options }: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-3 py-1.5 text-xs rounded-lg border border-zinc-200 bg-white text-zinc-700 focus:outline-none focus:border-zinc-400 transition-colors cursor-pointer min-w-[140px]"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
        checked ? "bg-zinc-900" : "bg-zinc-200"
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${
          checked ? "translate-x-4" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function RadioGroup({ value, onChange, options }: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex items-center gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
            value === o.value
              ? "bg-zinc-900 text-white border-zinc-900"
              : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300 hover:text-zinc-700"
          }`}
        >
          {value === o.value && <Check className="w-3 h-3" />}
          {o.label}
        </button>
      ))}
    </div>
  );
}

function TextInput({ value, onChange, placeholder }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="px-3 py-1.5 text-xs rounded-lg border border-zinc-200 bg-white text-zinc-700 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400 transition-colors w-64"
    />
  );
}

function NumberInput({ value, onChange, placeholder, unit }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  unit?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="px-3 py-1.5 text-xs rounded-lg border border-zinc-200 bg-white text-zinc-700 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400 transition-colors w-28"
      />
      {unit && <span className="text-xs text-zinc-400">{unit}</span>}
    </div>
  );
}

// ─── Save Bar ─────────────────────────────────────────────────────────────────

function SaveBar({ dirty, onSave, onReset }: {
  dirty: boolean;
  onSave: () => void;
  onReset: () => void;
}) {
  if (!dirty) return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-zinc-900 text-white px-5 py-3 rounded-2xl shadow-xl shadow-zinc-900/20">
      <span className="text-xs text-zinc-300">Kaydedilmemiş değişiklikleriniz var.</span>
      <button onClick={onReset} className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors px-2">
        Geri Al
      </button>
      <button
        onClick={onSave}
        className="flex items-center gap-1.5 px-4 py-1.5 bg-white text-zinc-900 text-xs font-semibold rounded-lg hover:bg-zinc-100 transition-colors"
      >
        <Check className="w-3 h-3" />
        Kaydet
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const defaultSettings: Settings = {
  olcuBirimi: "cm",
  agirlikBirimi: "kg",
  ondalikHassasiyet: "2",
  kutupBilgisi: "sku",
  hizalamaCizgisi: "hafif",
  renkKodlamasi: "farkli",
  raporBaslik: "",
  raporAltBilgi: "",
  qrKodAktif: true,
  veriDogrulama: "hata",
  birimSabitleme: "cm",
  excelEslestirme: false,
  apiAnahtari: "",
  arsivlemeSuresi: "1yil",
  istiflemeModu: "ust_uste",
  hataToleransi: "10",
  agirlikMerkeziHedef: "50",
};

export function Ayarlar() {
  const [settings, setSettings]   = useState<Settings>(defaultSettings);
  const [saved, setSaved]         = useState<Settings>(defaultSettings);
  const [activeSection, setActive] = useState("bolgesel");
  const [savedFlash, setSavedFlash] = useState(false);

  const dirty = JSON.stringify(settings) !== JSON.stringify(saved);

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setSettings((s) => ({ ...s, [key]: value }));

  const handleSave = () => {
    setSaved(settings);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
  };

  const handleReset = () => setSettings(saved);

  const scrollTo = (id: string) => {
    setActive(id);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="p-6 min-h-full flex flex-col gap-5">

      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 tracking-tight">Ayarlar</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Platform genelinde geçerli olacak teknik, görsel ve hesaplama tercihlerini yapılandırın.
          </p>
        </div>
        {savedFlash && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700 font-medium">
            <Check className="w-3.5 h-3.5" />
            Ayarlar kaydedildi
          </div>
        )}
      </div>

      {/* ── Body ── */}
      <div className="flex gap-6 items-start">

        {/* Content */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">

          {/* 6.1 */}
          <SectionCard
            id="bolgesel"
            title="Bölgesel ve Teknik Birim Ayarları"
            description="Sisteme girilen tüm ölçü ve ağırlık değerlerinin hangi birimlerde işleneceğini belirler."
          >
            <SettingRow
              label="Varsayılan Ölçü Birimi"
              description="Boyut (En × Boy × Yükseklik) alanlarında kullanılacak temel birim."
            >
              <RadioGroup
                value={settings.olcuBirimi}
                onChange={(v) => set("olcuBirimi", v as Settings["olcuBirimi"])}
                options={[{ value: "cm", label: "cm" }, { value: "mm", label: "mm" }]}
              />
            </SettingRow>

            <SettingRow
              label="Ağırlık Birimi"
              description="Araç ve ürün ağırlığı alanlarında gösterilecek varsayılan birim."
            >
              <RadioGroup
                value={settings.agirlikBirimi}
                onChange={(v) => set("agirlikBirimi", v as Settings["agirlikBirimi"])}
                options={[{ value: "kg", label: "kg" }, { value: "ton", label: "ton" }]}
              />
            </SettingRow>

            <SettingRow
              label="Ondalık Hassasiyeti"
              description="Hacim doluluk oranları hesaplanırken gösterilecek virgülden sonraki basamak sayısı."
            >
              <Select
                value={settings.ondalikHassasiyet}
                onChange={(v) => set("ondalikHassasiyet", v as Settings["ondalikHassasiyet"])}
                options={[
                  { value: "1", label: "1 basamak  (örn: %98.4)" },
                  { value: "2", label: "2 basamak  (örn: %98.45)" },
                  { value: "3", label: "3 basamak  (örn: %98.456)" },
                ]}
              />
            </SettingRow>
          </SectionCard>

          {/* 6.2 */}
          <SectionCard
            id="gorsellestirme"
            title="Görselleştirme ve Arayüz Ayarları"
            description="3D yükleme modeli üzerindeki etiket, çizgi ve renk tercihlerini yapılandırır."
          >
            <SettingRow
              label="Kutuların Üzerindeki Bilgiler"
              description="3D model üzerinde ürün kutularının üstünde sürekli görünecek bilgi türü."
            >
              <Select
                value={settings.kutupBilgisi}
                onChange={(v) => set("kutupBilgisi", v as Settings["kutupBilgisi"])}
                options={[
                  { value: "sku",   label: "SKU Kodu" },
                  { value: "adet",  label: "Adet" },
                  { value: "gizle", label: "Gösterme" },
                ]}
              />
            </SettingRow>

            <SettingRow
              label="Hizalama Çizgileri"
              description="Araç içindeki ızgara çizgilerinin görünürlük düzeyi."
            >
              <Select
                value={settings.hizalamaCizgisi}
                onChange={(v) => set("hizalamaCizgisi", v as Settings["hizalamaCizgisi"])}
                options={[
                  { value: "belirgin", label: "Belirgin" },
                  { value: "hafif",    label: "Hafif" },
                  { value: "gizle",    label: "Gösterme" },
                ]}
              />
            </SettingRow>

            <SettingRow
              label="Renk Kodlaması"
              description="3D modelde farklı SKU'ların renklendirme stratejisi."
            >
              <RadioGroup
                value={settings.renkKodlamasi}
                onChange={(v) => set("renkKodlamasi", v as Settings["renkKodlamasi"])}
                options={[
                  { value: "farkli", label: "Farklı Renkler" },
                  { value: "benzer", label: "Benzer Tonlar" },
                ]}
              />
            </SettingRow>
          </SectionCard>

          {/* 6.3 */}
          <SectionCard
            id="raporlama"
            title="Raporlama ve Çıktı Standartları"
            description="PDF/Excel çıktılarının içeriğini, şablon yapısını ve QR kod aktivasyonunu yönetir."
          >
            {/* Excel şablon alt başlık */}
            <div className="px-6 pt-4 pb-2">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                A — Excel Şablon Yönetimi
              </span>
            </div>

            <SettingRow
              label="Standart Şablon İndir"
              description="Kullanıcının doldurabileceği güncel Cargo Pilot Yükleme Şablonunu indir."
            >
              <button className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-zinc-200 bg-white text-zinc-600 text-xs font-medium hover:bg-zinc-50 transition-colors">
                <Download className="w-3.5 h-3.5" />
                .xlsx İndir
              </button>
            </SettingRow>

            <SettingRow
              label="Veri Doğrulama"
              description="Şablon dışı veri girişlerinde (örn: sayı yerine metin) sistemin tepki şekli."
            >
              <Select
                value={settings.veriDogrulama}
                onChange={(v) => set("veriDogrulama", v as Settings["veriDogrulama"])}
                options={[
                  { value: "hata",   label: "Hata — İşlemi durdur" },
                  { value: "uyari",  label: "Uyarı — İzin ver, bildir" },
                  { value: "pasif",  label: "Pasif — Doğrulama yok" },
                ]}
              />
            </SettingRow>

            <SettingRow
              label="Birim Sabitleme"
              description="Şablondaki değerlerin hangi birim olarak otomatik kabul edileceği."
            >
              <RadioGroup
                value={settings.birimSabitleme}
                onChange={(v) => set("birimSabitleme", v as Settings["birimSabitleme"])}
                options={[{ value: "cm", label: "cm" }, { value: "mm", label: "mm" }]}
              />
            </SettingRow>

            {/* PDF çıktı alt başlık */}
            <div className="px-6 pt-4 pb-2 border-t border-zinc-50">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                PDF ve Excel Rapor Bilgileri
              </span>
            </div>

            <SettingRow
              label="Rapor Başlığı"
              description="PDF ve Excel raporlarının üst kısmında görünecek firma adı ve iletişim bilgisi."
            >
              <TextInput
                value={settings.raporBaslik}
                onChange={(v) => set("raporBaslik", v)}
                placeholder="Örn: NEXLOG Lojistik A.Ş."
              />
            </SettingRow>

            <SettingRow
              label="Rapor Alt Bilgisi"
              description="Standart PDF raporlarının altına eklenecek kurumsal not veya onay ifadesi."
            >
              <TextInput
                value={settings.raporAltBilgi}
                onChange={(v) => set("raporAltBilgi", v)}
                placeholder="Örn: Yükleme Planı Onaylıdır"
              />
            </SettingRow>

            {/* QR alt başlık */}
            <div className="px-6 pt-4 pb-2 border-t border-zinc-50">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                B — QR Kod Fonksiyonu
              </span>
            </div>

            <SettingRow
              label="QR Kod Aktivasyonu"
              description="Raporlardaki QR kod, depodaki personeli doğrudan planın 3D interaktif görünümüne yönlendirir."
            >
              <Toggle
                checked={settings.qrKodAktif}
                onChange={(v) => set("qrKodAktif", v)}
              />
            </SettingRow>
          </SectionCard>

          {/* 6.4 */}
          <SectionCard
            id="veri"
            title="Veri ve Entegrasyon Ayarları"
            description="Excel kolon eşleştirme, API erişim anahtarı ve plan arşivleme süresini yapılandırır."
          >
            <SettingRow
              label="Excel Kolon Eşleştirme"
              description="Kendi Excel listenizi yüklerken kolon adlarını sistem alanlarıyla kalıcı olarak eşleştir."
            >
              <Toggle
                checked={settings.excelEslestirme}
                onChange={(v) => set("excelEslestirme", v)}
              />
            </SettingRow>

            <SettingRow
              label="API Anahtarı"
              description="Dış sistemlerden (ERP) ürün listesi çekilecekse kullanılacak güvenli erişim anahtarı."
            >
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  value={settings.apiAnahtari}
                  onChange={(e) => set("apiAnahtari", e.target.value)}
                  placeholder="sk-••••••••••••••••"
                  className="px-3 py-1.5 text-xs rounded-lg border border-zinc-200 bg-white text-zinc-700 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400 transition-colors w-64 font-mono"
                />
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 bg-white text-zinc-500 text-xs hover:bg-zinc-50 transition-colors">
                  <KeyRound className="w-3 h-3" />
                  Yenile
                </button>
              </div>
            </SettingRow>

            <SettingRow
              label="Plan Arşivleme Süresi"
              description="Onaylanan yükleme planlarının sistemde tutulacağı süre."
            >
              <Select
                value={settings.arsivlemeSuresi}
                onChange={(v) => set("arsivlemeSuresi", v as Settings["arsivlemeSuresi"])}
                options={[
                  { value: "3ay",     label: "3 Ay" },
                  { value: "6ay",     label: "6 Ay" },
                  { value: "1yil",    label: "1 Yıl" },
                  { value: "2yil",    label: "2 Yıl" },
                  { value: "suresiz", label: "Süresiz" },
                ]}
              />
            </SettingRow>
          </SectionCard>

          {/* 6.5 */}
          <SectionCard
            id="algoritma"
            title="Algoritma ve Hesaplama Parametreleri"
            description="3D yükleme planı oluştururken ürünlerin istiflenmesini, toleransları ve ağırlık dengesini belirler."
          >
            <SettingRow
              label="Varsayılan İstifleme Modu"
              description="Şablonda özel bir kısıt belirtilmemişse tüm ürünler için uygulanacak varsayılan kural."
            >
              <RadioGroup
                value={settings.istiflemeModu}
                onChange={(v) => set("istiflemeModu", v as Settings["istiflemeModu"])}
                options={[
                  { value: "ust_uste",  label: "Üst üste konulabilir" },
                  { value: "konulamaz", label: "Üst üste konulamaz" },
                ]}
              />
            </SettingRow>

            <SettingRow
              label="Hata Payı Toleransı"
              description="Araç içindeki ürünler arasında bırakılacak minimum boşluk payı."
            >
              <NumberInput
                value={settings.hataToleransi}
                onChange={(v) => set("hataToleransi", v)}
                placeholder="10"
                unit="mm"
              />
            </SettingRow>

            <SettingRow
              label="Ağırlık Merkezi Hedefi"
              description="Aracın aks yükü dengesi için hedeflenen ideal doluluk oranı (ön–arka ağırlık dağılımı)."
            >
              <NumberInput
                value={settings.agirlikMerkeziHedef}
                onChange={(v) => set("agirlikMerkeziHedef", v)}
                placeholder="50"
                unit="% ön aks"
              />
            </SettingRow>
          </SectionCard>

          {/* Bottom padding for save bar */}
          <div className="h-4" />
        </div>
      </div>

      <SaveBar dirty={dirty} onSave={handleSave} onReset={handleReset} />
    </div>
  );
}