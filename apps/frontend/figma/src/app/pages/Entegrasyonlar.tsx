import React from "react";
import { Plug, CheckCircle2, XCircle, Clock, RefreshCw, Plus, ExternalLink } from "lucide-react";

const entegrasyonlar = [
  {
    ad: "SAP ERP",
    kategori: "ERP",
    aciklama: "Sipariş ve stok senkronizasyonu",
    durum: "Bağlı",
    sonSync: "2 dk önce",
    logo: "SAP",
    renk: "bg-blue-600",
  },
  {
    ad: "Microsoft Dynamics",
    kategori: "CRM",
    aciklama: "Müşteri ve fatura entegrasyonu",
    durum: "Bağlı",
    sonSync: "15 dk önce",
    logo: "MS",
    renk: "bg-sky-500",
  },
  {
    ad: "Google Maps Platform",
    kategori: "Harita",
    aciklama: "Rota optimizasyonu ve konum takibi",
    durum: "Bağlı",
    sonSync: "Anlık",
    logo: "GM",
    renk: "bg-emerald-600",
  },
  {
    ad: "Stripe",
    kategori: "Ödeme",
    aciklama: "Otomatik fatura ve ödeme işleme",
    durum: "Hata",
    sonSync: "1 sa önce",
    logo: "ST",
    renk: "bg-violet-600",
  },
  {
    ad: "Slack",
    kategori: "Bildirim",
    aciklama: "Operasyon uyarıları ve bildirimler",
    durum: "Bağlı",
    sonSync: "5 dk önce",
    logo: "SL",
    renk: "bg-purple-500",
  },
  {
    ad: "Twilio",
    kategori: "SMS",
    aciklama: "Müşteri SMS bildirimleri",
    durum: "Beklemede",
    sonSync: "Yapılandırılmadı",
    logo: "TW",
    renk: "bg-rose-500",
  },
];

const durumConfig: Record<string, { label: string; style: string; icon: React.ElementType }> = {
  Bağlı: { label: "Bağlı", style: "bg-emerald-50 text-emerald-700 border border-emerald-200", icon: CheckCircle2 },
  Hata: { label: "Hata", style: "bg-rose-50 text-rose-700 border border-rose-200", icon: XCircle },
  Beklemede: { label: "Beklemede", style: "bg-zinc-100 text-zinc-500 border border-zinc-200", icon: Clock },
};

export function Entegrasyonlar() {
  const bagli = entegrasyonlar.filter((e) => e.durum === "Bağlı").length;
  const hata = entegrasyonlar.filter((e) => e.durum === "Hata").length;

  return (
    <div className="p-6 min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 tracking-tight">Entegrasyonlar</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Üçüncü parti servis bağlantıları ve API yönetimi</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-950 text-white text-sm font-medium hover:bg-zinc-800 transition-colors">
          <Plus className="w-3.5 h-3.5" />
          Entegrasyon Ekle
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 flex items-center gap-4">
          <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" strokeWidth={2} />
          </div>
          <div>
            <p className="text-2xl font-bold text-zinc-900 leading-none">{bagli}</p>
            <p className="text-xs text-zinc-500 mt-1">Aktif Bağlantı</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 flex items-center gap-4">
          <div className="w-9 h-9 bg-rose-50 rounded-xl flex items-center justify-center">
            <XCircle className="w-4 h-4 text-rose-600" strokeWidth={2} />
          </div>
          <div>
            <p className="text-2xl font-bold text-zinc-900 leading-none">{hata}</p>
            <p className="text-xs text-zinc-500 mt-1">Hatalı Bağlantı</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 flex items-center gap-4">
          <div className="w-9 h-9 bg-zinc-100 rounded-xl flex items-center justify-center">
            <Plug className="w-4 h-4 text-zinc-600" strokeWidth={2} />
          </div>
          <div>
            <p className="text-2xl font-bold text-zinc-900 leading-none">{entegrasyonlar.length}</p>
            <p className="text-xs text-zinc-500 mt-1">Toplam Entegrasyon</p>
          </div>
        </div>
      </div>

      {/* Entegrasyon Kartları */}
      <div className="grid grid-cols-3 gap-4">
        {entegrasyonlar.map((e) => {
          const { style, icon: Icon } = durumConfig[e.durum];
          return (
            <div key={e.ad} className="bg-white rounded-2xl border border-zinc-200/80 p-5 hover:border-zinc-300 transition-colors group">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 ${e.renk} rounded-xl flex items-center justify-center shrink-0`}>
                    <span className="text-white text-xs font-bold">{e.logo}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">{e.ad}</p>
                    <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-semibold mt-0.5">{e.kategori}</p>
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${style}`}>
                  <Icon className="w-2.5 h-2.5" />
                  {e.durum}
                </span>
              </div>
              <p className="text-xs text-zinc-500 mb-4 leading-relaxed">{e.aciklama}</p>
              <div className="flex items-center justify-between pt-3 border-t border-zinc-100">
                <div className="flex items-center gap-1 text-[11px] text-zinc-400">
                  <RefreshCw className="w-3 h-3" />
                  {e.sonSync}
                </div>
                <button className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-700 opacity-0 group-hover:opacity-100 transition-all">
                  Yönet
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
