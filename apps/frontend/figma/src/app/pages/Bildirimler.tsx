import React, { useState } from "react";
import {
  Bell,
  CheckCheck,
  Truck,
  Package,
  FileText,
  AlertTriangle,
  Info,
  CheckCircle2,
  X,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type BildirimTip = "bilgi" | "basari" | "uyari" | "hata";
type BildirimKategori = "plan" | "urun" | "arac" | "rapor" | "sistem";

interface Bildirim {
  id: string;
  tip: BildirimTip;
  kategori: BildirimKategori;
  baslik: string;
  aciklama: string;
  zaman: string;
  okundu: boolean;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const mockBildirimler: Bildirim[] = [
  {
    id: "1",
    tip: "basari",
    kategori: "plan",
    baslik: "Yükleme planı oluşturuldu",
    aciklama: "PL-2025-041 numaralı yükleme planı başarıyla oluşturuldu ve onaylandı.",
    zaman: "2 dk önce",
    okundu: false,
  },
  {
    id: "2",
    tip: "uyari",
    kategori: "arac",
    baslik: "Araç kapasitesi aşıldı",
    aciklama: "Volvo FH16 (TIR-001) için planlanan yük, maksimum kargo ağırlığının %103'üne ulaştı.",
    zaman: "18 dk önce",
    okundu: false,
  },
  {
    id: "3",
    tip: "bilgi",
    kategori: "urun",
    baslik: "Toplu ürün içe aktarımı tamamlandı",
    aciklama: "Excel şablonundan 142 ürün başarıyla içe aktarıldı. 3 satırda veri doğrulama uyarısı mevcut.",
    zaman: "1 saat önce",
    okundu: false,
  },
  {
    id: "4",
    tip: "basari",
    kategori: "rapor",
    baslik: "Rapor PDF olarak dışa aktarıldı",
    aciklama: "Haftalık sevkiyat raporu (23 Nisan 2025) başarıyla PDF formatında oluşturuldu.",
    zaman: "3 saat önce",
    okundu: true,
  },
  {
    id: "5",
    tip: "hata",
    kategori: "sistem",
    baslik: "API bağlantısı kesildi",
    aciklama: "ERP entegrasyonu (SAP) ile bağlantı kurulamadı. Lütfen API anahtarınızı kontrol edin.",
    zaman: "5 saat önce",
    okundu: true,
  },
  {
    id: "6",
    tip: "bilgi",
    kategori: "plan",
    baslik: "Plan güncellendi",
    aciklama: "PL-2025-038 numaralı plan üzerinde değişiklik yapıldı. Yeniden onay gerekiyor.",
    zaman: "Dün, 16:42",
    okundu: true,
  },
  {
    id: "7",
    tip: "uyari",
    kategori: "urun",
    baslik: "SKU çakışması tespit edildi",
    aciklama: "PRD-0089 ve PRD-0112 kodlu ürünler aynı SKU değerine sahip. Güncelleme gerekiyor.",
    zaman: "Dün, 11:05",
    okundu: true,
  },
  {
    id: "8",
    tip: "basari",
    kategori: "arac",
    baslik: "Yeni araç eklendi",
    aciklama: "Scania R500 (TIR-003) sisteme başarıyla eklendi ve aktif olarak işaretlendi.",
    zaman: "17 Nis, 09:30",
    okundu: true,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const tipConfig: Record<BildirimTip, { icon: React.ElementType; bg: string; iconColor: string; dot: string }> = {
  bilgi:   { icon: Info,          bg: "bg-blue-50",    iconColor: "text-blue-500",   dot: "bg-blue-400"   },
  basari:  { icon: CheckCircle2,  bg: "bg-emerald-50", iconColor: "text-emerald-500",dot: "bg-emerald-400" },
  uyari:   { icon: AlertTriangle, bg: "bg-amber-50",   iconColor: "text-amber-500",  dot: "bg-amber-400"  },
  hata:    { icon: AlertTriangle, bg: "bg-red-50",     iconColor: "text-red-500",    dot: "bg-red-400"    },
};

const kategoriConfig: Record<BildirimKategori, { icon: React.ElementType; label: string }> = {
  plan:    { icon: FileText, label: "Plan"    },
  urun:    { icon: Package,  label: "Ürün"    },
  arac:    { icon: Truck,    label: "Araç"    },
  rapor:   { icon: FileText, label: "Rapor"   },
  sistem:  { icon: Info,     label: "Sistem"  },
};

const filterLabels = ["Tümü", "Okunmamış", "Plan", "Ürün", "Araç", "Rapor", "Sistem"] as const;
type Filter = typeof filterLabels[number];

// ─── Component ────────────────────────────────────────────────────────────────

export function Bildirimler() {
  const [bildirimler, setBildirimler] = useState<Bildirim[]>(mockBildirimler);
  const [aktifFilter, setAktifFilter] = useState<Filter>("Tümü");

  const okunmamisSayisi = bildirimler.filter((b) => !b.okundu).length;

  const filtrelenmis = bildirimler.filter((b) => {
    if (aktifFilter === "Tümü")       return true;
    if (aktifFilter === "Okunmamış")  return !b.okundu;
    return b.kategori === aktifFilter.toLowerCase();
  });

  const tumunuOku = () =>
    setBildirimler((prev) => prev.map((b) => ({ ...b, okundu: true })));

  const okunduIsaretle = (id: string) =>
    setBildirimler((prev) =>
      prev.map((b) => (b.id === id ? { ...b, okundu: true } : b))
    );

  const sil = (id: string) =>
    setBildirimler((prev) => prev.filter((b) => b.id !== id));

  return (
    <div className="p-6 min-h-full flex flex-col gap-5">

      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 tracking-tight">Bildirimler</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Sistem olayları, plan güncellemeleri ve uyarıları buradan takip edin.
          </p>
        </div>
        {okunmamisSayisi > 0 && (
          <button
            onClick={tumunuOku}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-zinc-200 bg-white text-zinc-600 text-xs font-medium hover:bg-zinc-50 transition-colors"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Tümünü okundu işaretle
          </button>
        )}
      </div>

      {/* ── Filters ── */}
      <div className="flex items-center gap-2 flex-wrap">
        {filterLabels.map((f) => {
          const isActive = aktifFilter === f;
          const count = f === "Okunmamış" ? okunmamisSayisi : undefined;
          return (
            <button
              key={f}
              onClick={() => setAktifFilter(f)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                isActive
                  ? "bg-zinc-900 text-white border-zinc-900"
                  : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300 hover:text-zinc-700"
              }`}
            >
              {f}
              {count !== undefined && count > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  isActive ? "bg-white/20 text-white" : "bg-zinc-100 text-zinc-600"
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── List ── */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 overflow-hidden">
        {filtrelenmis.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-12 h-12 bg-zinc-100 rounded-2xl flex items-center justify-center mb-3">
              <Bell className="w-5 h-5 text-zinc-400" />
            </div>
            <p className="text-sm font-medium text-zinc-600">Bildirim bulunamadı</p>
            <p className="text-xs text-zinc-400 mt-1">Bu filtre için gösterilecek bildirim yok.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-50">
            {filtrelenmis.map((b) => {
              const { icon: TipIcon, bg, iconColor, dot } = tipConfig[b.tip];
              const { icon: KatIcon, label: katLabel } = kategoriConfig[b.kategori];
              return (
                <div
                  key={b.id}
                  className={`flex items-start gap-4 px-6 py-4 transition-colors group ${
                    !b.okundu ? "bg-zinc-50/60" : "bg-white hover:bg-zinc-50/40"
                  }`}
                >
                  {/* Icon */}
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${bg}`}>
                    <TipIcon className={`w-4 h-4 ${iconColor}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      {!b.okundu && (
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
                      )}
                      <span className={`text-xs font-semibold truncate ${!b.okundu ? "text-zinc-900" : "text-zinc-700"}`}>
                        {b.baslik}
                      </span>
                      <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-zinc-100 text-zinc-500 text-[10px] shrink-0">
                        <KatIcon className="w-2.5 h-2.5" />
                        {katLabel}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 leading-relaxed">{b.aciklama}</p>
                    <p className="text-[10px] text-zinc-400 mt-1.5">{b.zaman}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    {!b.okundu && (
                      <button
                        onClick={() => okunduIsaretle(b.id)}
                        title="Okundu işaretle"
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => sil(b.id)}
                      title="Kaldır"
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
