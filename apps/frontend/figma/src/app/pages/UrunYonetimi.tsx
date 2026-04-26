import React, { useState, useMemo } from "react";
import {
  Search,
  Download,
  Plus,
  Box,
  Pencil,
  Trash2,
  Droplets,
  AlertTriangle,
  ArrowUpToLine,
  ChevronDown,
  X,
  SlidersHorizontal,
} from "lucide-react";
import { TablePagination } from "../components/TablePagination";

// ─── Types ────────────────────────────────────────────────────────────────────

type Hassasiyet = "Kırılabilir" | "Sıvı İçerir" | "Ters Çevrilemez";
type UrunTip = "Koli" | "Varil";

interface Olculer {
  en?: number;
  boy?: number;
  yukseklik: number;
  cap?: number;
}

interface Urun {
  sku: string;
  ad: string;
  tip: UrunTip;
  olculer: Olculer;
  agirlik: number;
  hassasiyet: Hassasiyet[];
  maxIstifAdedi: number;
  maxIstifAgirligi: number;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

function hesaplaHacim(tip: UrunTip, o: Olculer): number {
  if (tip === "Koli" && o.en && o.boy) return o.en * o.boy * o.yukseklik;
  if (tip === "Varil" && o.cap)
    return Math.round(Math.PI * Math.pow(o.cap / 2, 2) * o.yukseklik);
  return 0;
}

const urunler: Urun[] = [
  { sku: "KLI-0041", ad: "Cam Kase Seti",       tip: "Koli",  olculer: { en: 40,  boy: 30, yukseklik: 20 }, agirlik: 3.2,  hassasiyet: ["Kırılabilir", "Ters Çevrilemez"], maxIstifAdedi: 3,  maxIstifAgirligi: 10  },
  { sku: "VAR-0012", ad: "Sıvı Deterjan",        tip: "Varil", olculer: { cap: 30, yukseklik: 50 },           agirlik: 18,   hassasiyet: ["Sıvı İçerir", "Ters Çevrilemez"],  maxIstifAdedi: 2,  maxIstifAgirligi: 36  },
  { sku: "KLI-0087", ad: "Elektronik Aksam",     tip: "Koli",  olculer: { en: 60,  boy: 40, yukseklik: 35 }, agirlik: 8.5,  hassasiyet: ["Kırılabilir"],                     maxIstifAdedi: 5,  maxIstifAgirligi: 42  },
  { sku: "KLI-0023", ad: "Tekstil Paketi",       tip: "Koli",  olculer: { en: 80,  boy: 60, yukseklik: 40 }, agirlik: 12,   hassasiyet: [],                                  maxIstifAdedi: 8,  maxIstifAgirligi: 96  },
  { sku: "VAR-0033", ad: "Yağlı Boya",           tip: "Varil", olculer: { cap: 25, yukseklik: 40 },           agirlik: 15,   hassasiyet: ["Sıvı İçerir"],                     maxIstifAdedi: 3,  maxIstifAgirligi: 45  },
  { sku: "KLI-0104", ad: "Seramik Fayans",       tip: "Koli",  olculer: { en: 50,  boy: 50, yukseklik: 15 }, agirlik: 22,   hassasiyet: ["Kırılabilir", "Ters Çevrilemez"], maxIstifAdedi: 4,  maxIstifAgirligi: 88  },
  { sku: "KLI-0055", ad: "Plastik Granül",       tip: "Koli",  olculer: { en: 70,  boy: 50, yukseklik: 50 }, agirlik: 25,   hassasiyet: [],                                  maxIstifAdedi: 10, maxIstifAgirligi: 250 },
  { sku: "VAR-0048", ad: "Kimyasal Çözücü",      tip: "Varil", olculer: { cap: 35, yukseklik: 60 },           agirlik: 30,   hassasiyet: ["Sıvı İçerir", "Ters Çevrilemez"],  maxIstifAdedi: 1,  maxIstifAgirligi: 30  },
  { sku: "KLI-0201", ad: "Ahşap Kasa",           tip: "Koli",  olculer: { en: 60,  boy: 40, yukseklik: 30 }, agirlik: 5,    hassasiyet: [],                                  maxIstifAdedi: 6,  maxIstifAgirligi: 30  },
  { sku: "VAR-0061", ad: "Motor Yağı",           tip: "Varil", olculer: { cap: 20, yukseklik: 35 },           agirlik: 16,   hassasiyet: ["Sıvı İçerir"],                     maxIstifAdedi: 4,  maxIstifAgirligi: 64  },
  { sku: "KLI-0156", ad: "Filtre Seti",          tip: "Koli",  olculer: { en: 30,  boy: 25, yukseklik: 20 }, agirlik: 2.1,  hassasiyet: ["Kırılabilir"],                     maxIstifAdedi: 5,  maxIstifAgirligi: 10  },
  { sku: "KLI-0178", ad: "Ambalaj Köpüğü",       tip: "Koli",  olculer: { en: 100, boy: 80, yukseklik: 60 }, agirlik: 8,    hassasiyet: [],                                  maxIstifAdedi: 12, maxIstifAgirligi: 96  },
  { sku: "VAR-0071", ad: "Asit Çözeltisi",       tip: "Varil", olculer: { cap: 40, yukseklik: 70 },           agirlik: 45,   hassasiyet: ["Sıvı İçerir", "Ters Çevrilemez"],  maxIstifAdedi: 1,  maxIstifAgirligi: 45  },
  { sku: "KLI-0234", ad: "Spor Ekipmanı",        tip: "Koli",  olculer: { en: 90,  boy: 50, yukseklik: 40 }, agirlik: 7,    hassasiyet: [],                                  maxIstifAdedi: 6,  maxIstifAgirligi: 42  },
  { sku: "KLI-0289", ad: "Kitap Kolisi",         tip: "Koli",  olculer: { en: 40,  boy: 30, yukseklik: 30 }, agirlik: 15,   hassasiyet: [],                                  maxIstifAdedi: 10, maxIstifAgirligi: 150 },
  { sku: "VAR-0089", ad: "Solvent",              tip: "Varil", olculer: { cap: 30, yukseklik: 45 },           agirlik: 22,   hassasiyet: ["Sıvı İçerir", "Ters Çevrilemez"],  maxIstifAdedi: 2,  maxIstifAgirligi: 44  },
  { sku: "KLI-0312", ad: "Kablo Makarası",       tip: "Koli",  olculer: { en: 50,  boy: 50, yukseklik: 40 }, agirlik: 18,   hassasiyet: ["Ters Çevrilemez"],                 maxIstifAdedi: 3,  maxIstifAgirligi: 54  },
  { sku: "KLI-0344", ad: "Medikal Malzeme",      tip: "Koli",  olculer: { en: 35,  boy: 25, yukseklik: 15 }, agirlik: 1.5,  hassasiyet: ["Kırılabilir"],                     maxIstifAdedi: 4,  maxIstifAgirligi: 6   },
  { sku: "VAR-0102", ad: "Zeytinyağı",           tip: "Varil", olculer: { cap: 25, yukseklik: 50 },           agirlik: 20,   hassasiyet: ["Sıvı İçerir"],                     maxIstifAdedi: 3,  maxIstifAgirligi: 60  },
  { sku: "KLI-0367", ad: "Otomotiv Parça",       tip: "Koli",  olculer: { en: 75,  boy: 55, yukseklik: 45 }, agirlik: 32,   hassasiyet: [],                                  maxIstifAdedi: 5,  maxIstifAgirligi: 160 },
  { sku: "KLI-0389", ad: "Deri Çanta Kolisi",    tip: "Koli",  olculer: { en: 55,  boy: 40, yukseklik: 35 }, agirlik: 6.5,  hassasiyet: [],                                  maxIstifAdedi: 7,  maxIstifAgirligi: 45  },
  { sku: "VAR-0115", ad: "Endüstriyel Yağ",      tip: "Varil", olculer: { cap: 45, yukseklik: 80 },           agirlik: 55,   hassasiyet: ["Sıvı İçerir"],                     maxIstifAdedi: 2,  maxIstifAgirligi: 110 },
  { sku: "KLI-0412", ad: "Gıda Takviyesi",       tip: "Koli",  olculer: { en: 30,  boy: 20, yukseklik: 20 }, agirlik: 3.8,  hassasiyet: ["Ters Çevrilemez"],                 maxIstifAdedi: 8,  maxIstifAgirligi: 30  },
  { sku: "KLI-0445", ad: "Alüminyum Profil",     tip: "Koli",  olculer: { en: 200, boy: 10, yukseklik: 10 }, agirlik: 14,   hassasiyet: [],                                  maxIstifAdedi: 6,  maxIstifAgirligi: 84  },
  { sku: "VAR-0128", ad: "Parfüm Konsantresi",   tip: "Varil", olculer: { cap: 20, yukseklik: 30 },           agirlik: 9,    hassasiyet: ["Sıvı İçerir", "Ters Çevrilemez"],  maxIstifAdedi: 3,  maxIstifAgirligi: 27  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

const hassasiyetConfig: Record<Hassasiyet, { icon: React.ElementType; label: string; style: string }> = {
  "Kırılabilir":    { icon: AlertTriangle,  label: "Kırılabilir",    style: "text-amber-600 bg-amber-50 border-amber-200"  },
  "Sıvı İçerir":   { icon: Droplets,       label: "Sıvı İçerir",   style: "text-blue-600 bg-blue-50 border-blue-200"     },
  "Ters Çevrilemez":{ icon: ArrowUpToLine, label: "Ters Çevrilemez",style: "text-rose-600 bg-rose-50 border-rose-200"     },
};

function HassasiyetBadge({ type }: { type: Hassasiyet }) {
  const { icon: Icon, label, style } = hassasiyetConfig[type];
  return (
    <span title={label} className={`inline-flex items-center justify-center w-6 h-6 rounded-md border ${style}`}>
      <Icon className="w-3 h-3" strokeWidth={2} />
    </span>
  );
}

function formatHacim(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)} m³`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)} dm³`;
  return `${v} cm³`;
}

function ColHeader({ label }: { label: string }) {
  return <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest">{label}</span>;
}

function VarilIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <ellipse cx="6" cy="2.5" rx="4" ry="1.5" stroke="#0ea5e9" strokeWidth="1.2" />
      <rect x="2" y="2.5" width="8" height="7" rx="1" stroke="#0ea5e9" strokeWidth="1.2" />
      <ellipse cx="6" cy="9.5" rx="4" ry="1.5" stroke="#0ea5e9" strokeWidth="1.2" />
      <line x1="2" y1="5.5" x2="10" y2="5.5" stroke="#0ea5e9" strokeWidth="0.8" strokeDasharray="1.5 1" />
      <line x1="2" y1="7" x2="10" y2="7" stroke="#0ea5e9" strokeWidth="0.8" strokeDasharray="1.5 1" />
    </svg>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function UrunYonetimi() {
  const [search, setSearch]         = useState("");
  const [tipFilter, setTipFilter]   = useState<UrunTip | "Tümü">("Tümü");
  const [page, setPage]             = useState(1);
  const [perPage, setPerPage]       = useState(10);

  const filtered = useMemo(() => urunler.filter((u) => {
    const q = search.toLowerCase();
    const matchSearch = u.sku.toLowerCase().includes(q) || u.ad.toLowerCase().includes(q);
    const matchTip    = tipFilter === "Tümü" || u.tip === tipFilter;
    return matchSearch && matchTip;
  }), [search, tipFilter]);

  const paginated = useMemo(() => {
    const start = (page - 1) * perPage;
    return filtered.slice(start, start + perPage);
  }, [filtered, page, perPage]);

  // Reset to page 1 on filter change
  const handleSearch = (v: string) => { setSearch(v); setPage(1); };
  const handleTip    = (v: UrunTip | "Tümü") => { setTipFilter(v); setPage(1); };

  return (
    <div className="p-6 min-h-full flex flex-col gap-5">

      {/* ── Header ── */}
      <div>
        <h1 className="text-xl font-bold text-zinc-900 tracking-tight">Ürün Yönetimi</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          Yükleme planında kullanılacak tüm birimlerin (SKU) teknik verilerinin yönetildiği merkezdir.
        </p>
      </div>

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-2.5">

        {/* Tip Filter */}
        <div className="flex items-center gap-1 bg-white border border-zinc-200 rounded-lg p-1 shrink-0">
          {(["Tümü", "Koli", "Varil"] as const).map((t) => (
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
            placeholder="SKU kodu veya ürün adı ile ara..."
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

        {/* Toplu Ürün Ekle */}
        <button className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-zinc-200 bg-white text-zinc-600 text-xs font-medium hover:bg-zinc-50 transition-colors shrink-0">
          <Plus className="w-3.5 h-3.5" />
          Toplu Ürün Ekle
        </button>

        {/* Yeni Ürün Ekle */}
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-950 text-white text-xs font-semibold hover:bg-zinc-800 transition-colors shrink-0">
          <Plus className="w-3.5 h-3.5" />
          Yeni Ürün Ekle
        </button>
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 overflow-hidden flex-1 flex flex-col">
        <div className="overflow-x-auto flex-1 flex flex-col">
          <table className="w-full" style={{ minWidth: 1080, height: '100%' }}>
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/60">
                <th className="text-left px-4 py-3 w-52"><ColHeader label="Ürün" /></th>
                <th className="text-left px-4 py-3 w-32"><ColHeader label="SKU" /></th>
                <th className="text-left px-4 py-3 w-20"><ColHeader label="Tip" /></th>
                <th className="text-left px-4 py-3 w-28"><ColHeader label="Uzunluk" /></th>
                <th className="text-left px-4 py-3 w-28"><ColHeader label="Genişlik" /></th>
                <th className="text-left px-4 py-3 w-28"><ColHeader label="Yükseklik" /></th>
                <th className="text-left px-4 py-3 w-28"><ColHeader label="Hacim" /></th>
                <th className="text-left px-4 py-3 w-24"><ColHeader label="Ağırlık" /></th>
                <th className="text-left px-4 py-3 w-32"><ColHeader label="Kısıtlar" /></th>
                <th className="text-left px-4 py-3 w-36 whitespace-nowrap"><ColHeader label="Katman Sayısı" /></th>
                <th className="px-4 py-3 w-20"><ColHeader label="İşlem" /></th>
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-50">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-sm text-zinc-400">
                    Eşleşen ürün bulunamadı.
                  </td>
                </tr>
              ) : (
                paginated.map((u) => {
                  const hacim  = hesaplaHacim(u.tip, u.olculer);
                  const isKoli = u.tip === "Koli";
                  return (
                    <tr key={u.sku} className="hover:bg-zinc-50/70 transition-colors" style={{ height: '52px' }}>

                      {/* Ürün Adı */}
                      <td className="px-4 align-middle max-w-[208px]">
                        <span className="text-xs text-zinc-800 block truncate" title={u.ad}>{u.ad}</span>
                      </td>

                      {/* SKU */}
                      <td className="px-4 align-middle">
                        <span className="text-xs text-zinc-800 font-mono">{u.sku}</span>
                      </td>

                      {/* Tip */}
                      <td className="px-4 align-middle">
                        <div className="flex items-center gap-1.5">
                          <div className={`w-5 h-5 rounded flex items-center justify-center ${isKoli ? "bg-zinc-100" : "bg-sky-50"}`}>
                            {isKoli ? <Box className="w-3 h-3 text-zinc-500" strokeWidth={2} /> : <VarilIcon />}
                          </div>
                          <span className="text-xs text-zinc-600">{u.tip}</span>
                        </div>
                      </td>

                      {/* Uzunluk */}
                      <td className="px-4 align-middle">
                        {isKoli
                          ? <span className="text-xs text-zinc-700 font-mono">{u.olculer.en} cm</span>
                          : <span className="text-xs text-zinc-300">—</span>}
                      </td>

                      {/* Genişlik */}
                      <td className="px-4 align-middle">
                        {isKoli
                          ? <span className="text-xs text-zinc-700 font-mono">{u.olculer.boy} cm</span>
                          : <span className="text-xs text-zinc-700 font-mono">Ø {u.olculer.cap} cm</span>}
                      </td>

                      {/* Yükseklik */}
                      <td className="px-4 align-middle">
                        <span className="text-xs text-zinc-700 font-mono">{u.olculer.yukseklik} cm</span>
                      </td>

                      {/* Hacim */}
                      <td className="px-4 align-middle">
                        <span className="text-xs font-medium text-zinc-700">{formatHacim(hacim)}</span>
                      </td>

                      {/* Ağırlık */}
                      <td className="px-4 align-middle">
                        <span className="text-xs font-medium text-zinc-700">{u.agirlik} kg</span>
                      </td>

                      {/* Kısıtlar */}
                      <td className="px-4 align-middle">
                        <div className="flex items-center gap-1">
                          {u.hassasiyet.length === 0
                            ? <span className="text-xs text-zinc-300">—</span>
                            : u.hassasiyet.map((h) => <HassasiyetBadge key={h} type={h} />)}
                        </div>
                      </td>

                      {/* Katman Sayısı */}
                      <td className="px-4 align-middle">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs text-zinc-700 font-medium">{u.maxIstifAdedi} kat</span>
                          <span className="text-[10px] text-zinc-400">maks. {u.maxIstifAgirligi} kg</span>
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
                  );
                })
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