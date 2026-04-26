import React, { useState, useMemo } from "react";
import {
  Search,
  Download,
  Plus,
  Truck,
  Package,
  Pencil,
  Trash2,
  ChevronDown,
  X,
  SlidersHorizontal,
} from "lucide-react";
import { TablePagination } from "../components/TablePagination";

// ─── Types ────────────────────────────────────────────────────────────────────

type AracTip = "Kamyon" | "Konteyner" | "Römork" | "Tır";
type KapiYonu = "Arka" | "Yan" | "Üst";

interface Arac {
  id: string;
  isim: string;
  tip: AracTip;
  olusturuldu: string;
  kapiYonu: KapiYonu;
  uzunluk: number;
  genislik: number;
  yukseklik: number;
  maxKargoYuku: number;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const araclar: Arac[] = [
  { id: "TIR-001", isim: "Volvo FH16",          tip: "Tır",       olusturuldu: "12.01.2025", kapiYonu: "Arka", uzunluk: 13.60, genislik: 2.40, yukseklik: 2.70, maxKargoYuku: 24000 },
  { id: "KMY-001", isim: "Mercedes Actros",     tip: "Kamyon",    olusturuldu: "18.02.2025", kapiYonu: "Arka", uzunluk: 7.20,  genislik: 2.35, yukseklik: 2.50, maxKargoYuku: 12000 },
  { id: "CNT-001", isim: "20ft Standart",        tip: "Konteyner", olusturuldu: "03.03.2025", kapiYonu: "Arka", uzunluk: 5.90,  genislik: 2.35, yukseklik: 2.39, maxKargoYuku: 21700 },
  { id: "CNT-002", isim: "40ft Standart",        tip: "Konteyner", olusturuldu: "03.03.2025", kapiYonu: "Arka", uzunluk: 12.03, genislik: 2.35, yukseklik: 2.39, maxKargoYuku: 26500 },
  { id: "ROM-001", isim: "Schmitz Cargobull",    tip: "Römork",    olusturuldu: "27.03.2025", kapiYonu: "Yan",  uzunluk: 13.60, genislik: 2.48, yukseklik: 2.70, maxKargoYuku: 27000 },
  { id: "TIR-002", isim: "DAF XF 530",           tip: "Tır",       olusturuldu: "10.04.2025", kapiYonu: "Arka", uzunluk: 13.60, genislik: 2.40, yukseklik: 2.70, maxKargoYuku: 24000 },
  { id: "KMY-002", isim: "MAN TGX 26.470",       tip: "Kamyon",    olusturuldu: "15.04.2025", kapiYonu: "Arka", uzunluk: 8.10,  genislik: 2.40, yukseklik: 2.60, maxKargoYuku: 15000 },
  { id: "ROM-002", isim: "Krone Mega Liner",     tip: "Römork",    olusturuldu: "20.04.2025", kapiYonu: "Üst",  uzunluk: 13.60, genislik: 2.48, yukseklik: 3.00, maxKargoYuku: 28000 },
  { id: "TIR-003", isim: "Scania R500",          tip: "Tır",       olusturuldu: "17.05.2025", kapiYonu: "Arka", uzunluk: 13.60, genislik: 2.40, yukseklik: 2.70, maxKargoYuku: 24000 },
  { id: "KMY-003", isim: "Ford Cargo 3530",      tip: "Kamyon",    olusturuldu: "18.05.2025", kapiYonu: "Yan",  uzunluk: 6.50,  genislik: 2.35, yukseklik: 2.45, maxKargoYuku: 10000 },
  { id: "CNT-003", isim: "40ft High Cube",       tip: "Konteyner", olusturuldu: "22.05.2025", kapiYonu: "Arka", uzunluk: 12.03, genislik: 2.35, yukseklik: 2.70, maxKargoYuku: 26500 },
  { id: "ROM-003", isim: "Wielton NS 3",         tip: "Römork",    olusturuldu: "28.05.2025", kapiYonu: "Arka", uzunluk: 13.60, genislik: 2.48, yukseklik: 2.75, maxKargoYuku: 27000 },
  { id: "TIR-004", isim: "Renault T520",         tip: "Tır",       olusturuldu: "01.06.2025", kapiYonu: "Arka", uzunluk: 13.60, genislik: 2.40, yukseklik: 2.70, maxKargoYuku: 24000 },
  { id: "KMY-004", isim: "Iveco Eurocargo",      tip: "Kamyon",    olusturuldu: "05.06.2025", kapiYonu: "Arka", uzunluk: 7.70,  genislik: 2.40, yukseklik: 2.55, maxKargoYuku: 13000 },
  { id: "CNT-004", isim: "20ft Open Top",        tip: "Konteyner", olusturuldu: "10.06.2025", kapiYonu: "Üst",  uzunluk: 5.90,  genislik: 2.35, yukseklik: 2.39, maxKargoYuku: 21700 },
  { id: "ROM-004", isim: "Kögel Cargo",          tip: "Römork",    olusturuldu: "14.06.2025", kapiYonu: "Yan",  uzunluk: 13.60, genislik: 2.48, yukseklik: 2.70, maxKargoYuku: 27000 },
  { id: "TIR-005", isim: "Mercedes Actros 18t",  tip: "Tır",       olusturuldu: "18.06.2025", kapiYonu: "Arka", uzunluk: 13.60, genislik: 2.40, yukseklik: 2.70, maxKargoYuku: 22000 },
  { id: "KMY-005", isim: "Volvo FMX",            tip: "Kamyon",    olusturuldu: "22.06.2025", kapiYonu: "Arka", uzunluk: 9.00,  genislik: 2.40, yukseklik: 2.65, maxKargoYuku: 18000 },
  { id: "CNT-005", isim: "45ft Pallet Wide",     tip: "Konteyner", olusturuldu: "25.06.2025", kapiYonu: "Arka", uzunluk: 13.56, genislik: 2.44, yukseklik: 2.70, maxKargoYuku: 27000 },
  { id: "ROM-005", isim: "Schwarzmüller SPA",    tip: "Römork",    olusturuldu: "30.06.2025", kapiYonu: "Arka", uzunluk: 13.60, genislik: 2.48, yukseklik: 2.80, maxKargoYuku: 26500 },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

const tipConfig: Record<AracTip, { bg: string; iconColor: string }> = {
  "Kamyon":    { bg: "bg-zinc-100",  iconColor: "text-zinc-500"   },
  "Konteyner": { bg: "bg-sky-50",    iconColor: "text-sky-500"    },
  "Römork":    { bg: "bg-amber-50",  iconColor: "text-amber-500"  },
  "Tır":       { bg: "bg-indigo-50", iconColor: "text-indigo-500" },
};

const kapiYonuStyle: Record<KapiYonu, string> = {
  "Arka": "text-zinc-600 bg-zinc-100 border-zinc-200",
  "Yan":  "text-teal-600 bg-teal-50 border-teal-200",
  "Üst":  "text-violet-600 bg-violet-50 border-violet-200",
};

function TipIcon({ tip }: { tip: AracTip }) {
  const { bg, iconColor } = tipConfig[tip];
  return (
    <div className={`w-5 h-5 rounded flex items-center justify-center ${bg}`}>
      {tip === "Konteyner"
        ? <Package className={`w-3 h-3 ${iconColor}`} strokeWidth={2} />
        : <Truck className={`w-3 h-3 ${iconColor}`} strokeWidth={2} />}
    </div>
  );
}

function formatYuk(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)} t`;
  return `${kg} kg`;
}

function ColHeader({ label }: { label: string }) {
  return <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest">{label}</span>;
}

// ─── Main Component ───────────────────────────────────────────────────────────

const TIP_OPTIONS: (AracTip | "Tümü")[] = ["Tümü", "Kamyon", "Konteyner", "Römork", "Tır"];

export function AracYonetimi() {
  const [search, setSearch]       = useState("");
  const [tipFilter, setTipFilter] = useState<AracTip | "Tümü">("Tümü");
  const [page, setPage]           = useState(1);
  const [perPage, setPerPage]     = useState(10);

  const filtered = useMemo(() => araclar.filter((a) => {
    const q = search.toLowerCase();
    const matchSearch = a.isim.toLowerCase().includes(q) || a.id.toLowerCase().includes(q);
    const matchTip    = tipFilter === "Tümü" || a.tip === tipFilter;
    return matchSearch && matchTip;
  }), [search, tipFilter]);

  const paginated = useMemo(() => {
    const start = (page - 1) * perPage;
    return filtered.slice(start, start + perPage);
  }, [filtered, page, perPage]);

  const handleSearch = (v: string) => { setSearch(v); setPage(1); };
  const handleTip    = (v: AracTip | "Tümü") => { setTipFilter(v); setPage(1); };

  return (
    <div className="p-6 min-h-full flex flex-col gap-5">

      {/* ── Header ── */}
      <div>
        <h1 className="text-xl font-bold text-zinc-900 tracking-tight">Araç Yönetimi</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          Lojistik operasyonlarda kullanılan tır, kamyon ve konteynerlerin fiziksel kısıtlarını tanımlar.
        </p>
      </div>

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-2.5">

        {/* Tip Filter */}
        <div className="flex items-center gap-1 bg-white border border-zinc-200 rounded-lg p-1 shrink-0">
          {TIP_OPTIONS.map((t) => (
            <button
              key={t}
              onClick={() => handleTip(t)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                tipFilter === t ? "bg-zinc-900 text-white" : "text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Araç ismine göre ara..."
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

        {/* Gelişmiş Filtre */}
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

        {/* Yeni Araç Ekle */}
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-950 text-white text-xs font-semibold hover:bg-zinc-800 transition-colors shrink-0">
          <Plus className="w-3.5 h-3.5" />
          Yeni Araç Ekle
        </button>
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 overflow-hidden flex-1 flex flex-col">
        <div className="overflow-x-auto flex-1 flex flex-col">
          <table className="w-full" style={{ minWidth: 1000, height: '100%' }}>
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/60">
                <th className="text-left px-4 py-3 w-52"><ColHeader label="İsim" /></th>
                <th className="text-left px-4 py-3 w-32"><ColHeader label="Tip" /></th>
                <th className="text-left px-4 py-3 w-32"><ColHeader label="Oluşturuldu" /></th>
                <th className="text-left px-4 py-3 w-28"><ColHeader label="Kapı Yönü" /></th>
                <th className="text-left px-4 py-3 w-28"><ColHeader label="Uzunluk" /></th>
                <th className="text-left px-4 py-3 w-28"><ColHeader label="Genişlik" /></th>
                <th className="text-left px-4 py-3 w-28"><ColHeader label="Yükseklik" /></th>
                <th className="text-left px-4 py-3 w-32"><ColHeader label="Max Yük" /></th>
                <th className="px-4 py-3 w-20"><ColHeader label="İşlem" /></th>
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-50">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-sm text-zinc-400">
                    Eşleşen araç bulunamadı.
                  </td>
                </tr>
              ) : (
                <>
                  {paginated.map((a) => (
                    <tr key={a.id} className="hover:bg-zinc-50/70 transition-colors" style={{ height: '52px' }}>

                      {/* İsim */}
                      <td className="px-4 align-middle max-w-[208px]">
                        <span className="text-xs text-zinc-800 block truncate" title={a.isim}>{a.isim}</span>
                      </td>

                      {/* Tip */}
                      <td className="px-4 align-middle">
                        <div className="flex items-center gap-1.5">
                          <TipIcon tip={a.tip} />
                          <span className={`text-xs ${tipConfig[a.tip].iconColor}`}>{a.tip}</span>
                        </div>
                      </td>

                      {/* Oluşturuldu */}
                      <td className="px-4 align-middle">
                        <span className="text-xs text-zinc-500">{a.olusturuldu}</span>
                      </td>

                      {/* Kapı Yönü */}
                      <td className="px-4 align-middle">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${kapiYonuStyle[a.kapiYonu]}`}>
                          {a.kapiYonu}
                        </span>
                      </td>

                      {/* Uzunluk */}
                      <td className="px-4 align-middle">
                        <span className="text-xs text-zinc-700 font-mono">{a.uzunluk} m</span>
                      </td>

                      {/* Genişlik */}
                      <td className="px-4 align-middle">
                        <span className="text-xs text-zinc-700 font-mono">{a.genislik} m</span>
                      </td>

                      {/* Yükseklik */}
                      <td className="px-4 align-middle">
                        <span className="text-xs text-zinc-700 font-mono">{a.yukseklik} m</span>
                      </td>

                      {/* Max Yük */}
                      <td className="px-4 align-middle">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-medium text-zinc-700">{formatYuk(a.maxKargoYuku)}</span>
                          <span className="text-[10px] text-zinc-400">{a.maxKargoYuku.toLocaleString("tr-TR")} kg</span>
                        </div>
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
                  ))}
                </>
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