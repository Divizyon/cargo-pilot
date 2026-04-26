import React, { useState, useMemo } from "react";
import {
  Search,
  Download,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  X,
  SlidersHorizontal,
  Truck,
  Package,
  CalendarDays,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  TrendingUp,
} from "lucide-react";
import { TablePagination } from "../components/TablePagination";

// ─── Types ────────────────────────────────────────────────────────────────────

type PlanDurum = "Taslak" | "Aktif" | "Tamamlandı" | "İptal";

interface YuklemePlani {
  id: string;
  ad: string;
  arac: string;
  aracTip: "Tır" | "Kamyon" | "Konteyner" | "Römork";
  olusturuldu: string;
  planlanmis: string;
  durum: PlanDurum;
  urunSayisi: number;
  toplamAgirlik: number;
  dolulukOrani: number;
}

// ─── Mock Data ─────────────────────────────────────────────────────────────────

const planlar: YuklemePlani[] = [
  { id: "PLN-2025-001", ad: "İstanbul → Ankara Sevkiyatı",      arac: "Volvo FH16",         aracTip: "Tır",       olusturuldu: "02.01.2025", planlanmis: "10.01.2025", durum: "Tamamlandı", urunSayisi: 18, toplamAgirlik: 19400, dolulukOrani: 91 },
  { id: "PLN-2025-002", ad: "İzmir Liman Çıkış Konteyneri",     arac: "40ft Standart",      aracTip: "Konteyner", olusturuldu: "08.01.2025", planlanmis: "15.01.2025", durum: "Tamamlandı", urunSayisi: 32, toplamAgirlik: 22100, dolulukOrani: 83 },
  { id: "PLN-2025-003", ad: "Bursa Fabrika Tedarik Planı",      arac: "Mercedes Actros",    aracTip: "Kamyon",    olusturuldu: "15.02.2025", planlanmis: "20.02.2025", durum: "Tamamlandı", urunSayisi: 11, toplamAgirlik: 9800,  dolulukOrani: 78 },
  { id: "PLN-2025-004", ad: "Adana → Mersin Rota Planı",        arac: "DAF XF 530",         aracTip: "Tır",       olusturuldu: "01.03.2025", planlanmis: "08.03.2025", durum: "Tamamlandı", urunSayisi: 24, toplamAgirlik: 21500, dolulukOrani: 89 },
  { id: "PLN-2025-005", ad: "Ankara Depo Taşıma",               arac: "Schmitz Cargobull",  aracTip: "Römork",    olusturuldu: "12.03.2025", planlanmis: "18.03.2025", durum: "İptal",      urunSayisi: 7,  toplamAgirlik: 5200,  dolulukOrani: 19 },
  { id: "PLN-2025-006", ad: "İstanbul Avrupa Yakası Dağıtım",   arac: "MAN TGX 26.470",     aracTip: "Kamyon",    olusturuldu: "20.03.2025", planlanmis: "28.03.2025", durum: "Tamamlandı", urunSayisi: 15, toplamAgirlik: 12600, dolulukOrani: 84 },
  { id: "PLN-2025-007", ad: "Tekstil İhracat Konteyneri",       arac: "40ft High Cube",     aracTip: "Konteyner", olusturuldu: "02.04.2025", planlanmis: "12.04.2025", durum: "Tamamlandı", urunSayisi: 41, toplamAgirlik: 18900, dolulukOrani: 71 },
  { id: "PLN-2025-008", ad: "Karadeniz Bölge Sevkiyatı",        arac: "Scania R500",        aracTip: "Tır",       olusturuldu: "10.04.2025", planlanmis: "17.04.2025", durum: "Aktif",      urunSayisi: 29, toplamAgirlik: 20800, dolulukOrani: 86 },
  { id: "PLN-2025-009", ad: "Ege Bölgesi Gıda Dağıtımı",       arac: "Ford Cargo 3530",    aracTip: "Kamyon",    olusturuldu: "14.04.2025", planlanmis: "21.04.2025", durum: "Aktif",      urunSayisi: 9,  toplamAgirlik: 7400,  dolulukOrani: 74 },
  { id: "PLN-2025-010", ad: "Otomotiv Parça İhracatı",          arac: "Krone Mega Liner",   aracTip: "Römork",    olusturuldu: "18.04.2025", planlanmis: "26.04.2025", durum: "Taslak",     urunSayisi: 13, toplamAgirlik: 11200, dolulukOrani: 40 },
  { id: "PLN-2025-011", ad: "İstanbul → Konya Yükü",            arac: "Renault T520",       aracTip: "Tır",       olusturuldu: "20.04.2025", planlanmis: "28.04.2025", durum: "Taslak",     urunSayisi: 22, toplamAgirlik: 16700, dolulukOrani: 69 },
  { id: "PLN-2025-012", ad: "Marmara Lojistik Paketi",          arac: "Iveco Eurocargo",    aracTip: "Kamyon",    olusturuldu: "21.04.2025", planlanmis: "30.04.2025", durum: "Taslak",     urunSayisi: 5,  toplamAgirlik: 3900,  dolulukOrani: 30 },
  { id: "PLN-2025-013", ad: "20ft Kimyasal Madde Sevkiyatı",    arac: "20ft Standart",      aracTip: "Konteyner", olusturuldu: "22.04.2025", planlanmis: "02.05.2025", durum: "Taslak",     urunSayisi: 8,  toplamAgirlik: 17200, dolulukOrani: 79 },
  { id: "PLN-2025-014", ad: "Güneydoğu Bölge Dağıtımı",        arac: "Mercedes Actros 18t",aracTip: "Tır",       olusturuldu: "22.04.2025", planlanmis: "05.05.2025", durum: "Taslak",     urunSayisi: 19, toplamAgirlik: 15400, dolulukOrani: 70 },
  { id: "PLN-2025-015", ad: "Volvo Aksam Deposu Transferi",     arac: "Volvo FMX",          aracTip: "Kamyon",    olusturuldu: "23.04.2025", planlanmis: "06.05.2025", durum: "Taslak",     urunSayisi: 14, toplamAgirlik: 14100, dolulukOrani: 78 },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

const durumConfig: Record<PlanDurum, { label: string; style: string; icon: React.ElementType }> = {
  "Taslak":      { label: "Taslak",      style: "text-zinc-500 bg-zinc-100 border-zinc-200",        icon: FileText     },
  "Aktif":       { label: "Aktif",       style: "text-blue-600 bg-blue-50 border-blue-200",          icon: Clock        },
  "Tamamlandı":  { label: "Tamamlandı",  style: "text-emerald-600 bg-emerald-50 border-emerald-200", icon: CheckCircle2 },
  "İptal":       { label: "İptal",       style: "text-rose-600 bg-rose-50 border-rose-200",          icon: XCircle      },
};

const aracTipConfig: Record<string, { bg: string; iconColor: string }> = {
  "Kamyon":    { bg: "bg-zinc-100",  iconColor: "text-zinc-500"   },
  "Konteyner": { bg: "bg-sky-50",    iconColor: "text-sky-500"    },
  "Römork":    { bg: "bg-amber-50",  iconColor: "text-amber-500"  },
  "Tır":       { bg: "bg-indigo-50", iconColor: "text-indigo-500" },
};

function DurumBadge({ durum }: { durum: PlanDurum }) {
  const { label, style, icon: Icon } = durumConfig[durum];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border ${style}`}>
      <Icon className="w-3 h-3" strokeWidth={2} />
      {label}
    </span>
  );
}

function DolulukBar({ oran }: { oran: number }) {
  const color =
    oran >= 80 ? "bg-emerald-500" :
    oran >= 50 ? "bg-amber-400" :
    "bg-zinc-300";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${oran}%` }} />
      </div>
      <span className="text-xs text-zinc-600 font-mono tabular-nums">%{oran}</span>
    </div>
  );
}

function AracTipIcon({ tip }: { tip: string }) {
  const { bg, iconColor } = aracTipConfig[tip] ?? { bg: "bg-zinc-100", iconColor: "text-zinc-500" };
  return (
    <div className={`w-5 h-5 rounded flex items-center justify-center ${bg}`}>
      {tip === "Konteyner"
        ? <Package className={`w-3 h-3 ${iconColor}`} strokeWidth={2} />
        : <Truck className={`w-3 h-3 ${iconColor}`} strokeWidth={2} />}
    </div>
  );
}

function ColHeader({ label }: { label: string }) {
  return <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest">{label}</span>;
}

// ─── Stats ────────────────────────────────────────────────────────────────────

function Stats() {
  const toplam     = planlar.length;
  const aktif      = planlar.filter((p) => p.durum === "Aktif").length;
  const tamamlandi = planlar.filter((p) => p.durum === "Tamamlandı").length;
  const taslak     = planlar.filter((p) => p.durum === "Taslak").length;
  const ortDoluluk = Math.round(planlar.reduce((s, p) => s + p.dolulukOrani, 0) / planlar.length);

  const cards = [
    { label: "Toplam Plan",     value: toplam,          sub: "tüm zamanlar",     accent: "text-zinc-800",    icon: FileText,      iconBg: "bg-zinc-100",    iconColor: "text-zinc-500"    },
    { label: "Aktif Plan",      value: aktif,           sub: "devam ediyor",      accent: "text-blue-700",    icon: Clock,         iconBg: "bg-blue-50",     iconColor: "text-blue-500"    },
    { label: "Tamamlandı",      value: tamamlandi,      sub: "başarılı",          accent: "text-emerald-700", icon: CheckCircle2,  iconBg: "bg-emerald-50",  iconColor: "text-emerald-500" },
    { label: "Taslak",          value: taslak,          sub: "bekliyor",          accent: "text-zinc-600",    icon: CalendarDays,  iconBg: "bg-zinc-100",    iconColor: "text-zinc-400"    },
    { label: "Ort. Doluluk",    value: `%${ortDoluluk}`,sub: "verimlilik",        accent: "text-amber-700",   icon: TrendingUp,    iconBg: "bg-amber-50",    iconColor: "text-amber-500"   },
  ];

  return (
    <div className="grid grid-cols-5 gap-3">
      {cards.map((c) => (
        <div key={c.label} className="bg-white border border-zinc-200/80 rounded-xl px-4 py-3.5 flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${c.iconBg}`}>
            <c.icon className={`w-4 h-4 ${c.iconColor}`} strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <p className={`text-xl font-bold leading-none ${c.accent}`}>{c.value}</p>
            <p className="text-[11px] text-zinc-400 mt-0.5 leading-none">{c.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const DURUM_OPTIONS: (PlanDurum | "Tümü")[] = ["Tümü", "Taslak", "Aktif", "Tamamlandı", "İptal"];

export function YuklemePlanlari() {
  const [search, setSearch]         = useState("");
  const [durumFilter, setDurumFilter] = useState<PlanDurum | "Tümü">("Tümü");
  const [page, setPage]             = useState(1);
  const [perPage, setPerPage]       = useState(10);

  const filtered = useMemo(() => planlar.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch = p.ad.toLowerCase().includes(q) || p.id.toLowerCase().includes(q) || p.arac.toLowerCase().includes(q);
    const matchDurum  = durumFilter === "Tümü" || p.durum === durumFilter;
    return matchSearch && matchDurum;
  }), [search, durumFilter]);

  const paginated = useMemo(() => {
    const start = (page - 1) * perPage;
    return filtered.slice(start, start + perPage);
  }, [filtered, page, perPage]);

  const handleSearch = (v: string) => { setSearch(v); setPage(1); };
  const handleDurum  = (v: PlanDurum | "Tümü") => { setDurumFilter(v); setPage(1); };

  return (
    <div className="p-6 min-h-full flex flex-col gap-5">

      {/* ── Header ── */}
      <div>
        <h1 className="text-xl font-bold text-zinc-900 tracking-tight">Yükleme Planları</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          Araçlara atanmış tüm yükleme planlarının izlendiği ve yönetildiği merkez.
        </p>
      </div>

      {/* ── Stats ── */}
      <Stats />

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-2.5">

        {/* Durum Filter */}
        <div className="flex items-center gap-1 bg-white border border-zinc-200 rounded-lg p-1 shrink-0">
          {DURUM_OPTIONS.map((d) => (
            <button
              key={d}
              onClick={() => handleDurum(d)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                durumFilter === d ? "bg-zinc-900 text-white" : "text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100"
              }`}
            >
              {d}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Plan adı, ID veya araç ile ara..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-zinc-200 bg-white text-zinc-700 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400 transition-colors"
          />
          {search && (
            <button onClick={() => handleSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Filtrele */}
        <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-zinc-200 bg-white text-zinc-500 text-xs hover:bg-zinc-50 transition-colors shrink-0">
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Filtrele
          <ChevronDown className="w-3 h-3" />
        </button>

        {/* Dışa Aktar */}
        <button className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-zinc-200 bg-white text-zinc-600 text-xs font-medium hover:bg-zinc-50 transition-colors shrink-0">
          <Download className="w-3.5 h-3.5" />
          Dışa Aktar
        </button>

        {/* Yeni Plan */}
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-950 text-white text-xs font-semibold hover:bg-zinc-800 transition-colors shrink-0">
          <Plus className="w-3.5 h-3.5" />
          Yeni Plan Oluştur
        </button>
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 overflow-hidden flex-1 flex flex-col">
        <div className="overflow-x-auto flex-1 flex flex-col">
          <table className="w-full" style={{ minWidth: 1060, height: "100%" }}>
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/60">
                <th className="text-left px-4 py-3"><ColHeader label="Plan" /></th>
                <th className="text-left px-4 py-3 w-36"><ColHeader label="Araç" /></th>
                <th className="text-left px-4 py-3 w-28"><ColHeader label="Oluşturuldu" /></th>
                <th className="text-left px-4 py-3 w-28"><ColHeader label="Planlanan" /></th>
                <th className="text-left px-4 py-3 w-32"><ColHeader label="Durum" /></th>
                <th className="text-left px-4 py-3 w-24"><ColHeader label="Ürün Sayısı" /></th>
                <th className="text-left px-4 py-3 w-28"><ColHeader label="Top. Ağırlık" /></th>
                <th className="text-left px-4 py-3 w-36"><ColHeader label="Doluluk" /></th>
                <th className="px-4 py-3 w-20"><ColHeader label="İşlem" /></th>
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-50">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-sm text-zinc-400">
                    Eşleşen plan bulunamadı.
                  </td>
                </tr>
              ) : (
                paginated.map((p) => (
                  <tr key={p.id} className="hover:bg-zinc-50/70 transition-colors" style={{ height: "52px" }}>

                    {/* Plan */}
                    <td className="px-4 align-middle">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs text-zinc-800">{p.ad}</span>
                        <span className="font-mono text-[10px] text-zinc-400">{p.id}</span>
                      </div>
                    </td>

                    {/* Araç */}
                    <td className="px-4 align-middle">
                      <div className="flex items-center gap-1.5">
                        <AracTipIcon tip={p.aracTip} />
                        <span className="text-xs text-zinc-600 truncate max-w-[110px]">{p.arac}</span>
                      </div>
                    </td>

                    {/* Oluşturuldu */}
                    <td className="px-4 align-middle">
                      <span className="text-xs text-zinc-500">{p.olusturuldu}</span>
                    </td>

                    {/* Planlanmış */}
                    <td className="px-4 align-middle">
                      <span className="text-xs text-zinc-500">{p.planlanmis}</span>
                    </td>

                    {/* Durum */}
                    <td className="px-4 align-middle">
                      <DurumBadge durum={p.durum} />
                    </td>

                    {/* Ürün Sayısı */}
                    <td className="px-4 align-middle">
                      <span className="text-xs font-mono text-zinc-700">{p.urunSayisi} ürün</span>
                    </td>

                    {/* Ağırlık */}
                    <td className="px-4 align-middle">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-medium text-zinc-700">
                          {(p.toplamAgirlik / 1000).toFixed(1)} t
                        </span>
                        <span className="text-[10px] text-zinc-400">
                          {p.toplamAgirlik.toLocaleString("tr-TR")} kg
                        </span>
                      </div>
                    </td>

                    {/* Doluluk */}
                    <td className="px-4 align-middle">
                      <DolulukBar oran={p.dolulukOrani} />
                    </td>

                    {/* İşlem */}
                    <td className="px-4 align-middle">
                      <div className="flex items-center gap-1">
                        <button title="Düzenle" className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button title="Sil" className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <TablePagination
          total={filtered.length}
          page={page}
          perPage={perPage}
          onPageChange={setPage}
          onPerPageChange={(n) => { setPerPage(n); setPage(1); }}
        />
      </div>
    </div>
  );
}
