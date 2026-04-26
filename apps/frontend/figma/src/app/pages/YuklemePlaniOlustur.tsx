import React, { useState } from "react";
import {
  ChevronDown,
  Download,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronsLeft,
  ChevronsRight,
  Truck,
  Package,
  AlertTriangle,
  CheckCircle2,
  FlipHorizontal,
  Flame,
  ArrowDownToLine,
  Plus,
  FolderPlus,
  ChevronRight,
  Layers,
  Box,
  X,
  GripVertical,
  Eye,
  MoveHorizontal,
  MoveVertical,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────────

type ViewMode = "3D" | "Önden" | "Yandan" | "Üstten";

const ARACLAR = [
  { id: "CNT-002", ad: "40ft Standart",     tip: "Konteyner", ic: { u: 12.03, g: 2.35, y: 2.39 }, maxYuk: 26500 },
  { id: "CNT-003", ad: "40ft High Cube",    tip: "Konteyner", ic: { u: 12.03, g: 2.35, y: 2.70 }, maxYuk: 26500 },
  { id: "TIR-001", ad: "Volvo FH16",        tip: "Tır",       ic: { u: 13.60, g: 2.40, y: 2.70 }, maxYuk: 24000 },
  { id: "ROM-001", ad: "Schmitz Cargobull", tip: "Römork",    ic: { u: 13.60, g: 2.48, y: 2.70 }, maxYuk: 27000 },
];

interface Urun {
  id: string;
  ad: string;
  adet: number;
  agirlik: number; // kg per unit
  boyut: string;
  renk: string;
  dotClass: string;
  kisitlar: string[];
}

interface Grup {
  id: string;
  ad: string;
  acik: boolean;
  urunIdler: string[];
}

const URUNLER: Urun[] = [
  { id: "U1", ad: "Elektronik Aksam",   adet: 18, agirlik: 180, boyut: "80×60×40 cm",  renk: "indigo", dotClass: "bg-indigo-500", kisitlar: ["fragile"]     },
  { id: "U2", ad: "Tekstil Paketleri",  adet: 24, agirlik: 80,  boyut: "60×40×30 cm",  renk: "sky",    dotClass: "bg-sky-500",    kisitlar: []              },
  { id: "U3", ad: "Plastik Bileşenler", adet: 12, agirlik: 240, boyut: "100×80×60 cm", renk: "amber",  dotClass: "bg-amber-500",  kisitlar: ["heavy_side"]  },
  { id: "U4", ad: "Metal Profiller",    adet: 8,  agirlik: 550, boyut: "200×10×10 cm", renk: "rose",   dotClass: "bg-rose-500",   kisitlar: ["bottom_only"] },
  { id: "U5", ad: "Kimyasal Variller",  adet: 6,  agirlik: 900, boyut: "60×60×90 cm",  renk: "violet", dotClass: "bg-violet-500", kisitlar: ["hazmat"]      },
  { id: "U6", ad: "Ahşap Kasalar",      adet: 15, agirlik: 120, boyut: "80×80×60 cm",  renk: "orange", dotClass: "bg-orange-400", kisitlar: []              },
];

const KISIT_META: Record<string, { icon: React.ElementType; label: string }> = {
  fragile:    { icon: AlertTriangle,   label: "Kırılgan"       },
  heavy_side: { icon: FlipHorizontal,  label: "Yan Yükleme"    },
  bottom_only:{ icon: ArrowDownToLine, label: "Alt Katman"     },
  hazmat:     { icon: Flame,           label: "Tehlikeli Mad." },
};

// ─── 3D Container Viewport ─────────────────────────────────────────────────────

function Container3DView({ viewMode, onViewChange }: { viewMode: ViewMode; onViewChange: (v: ViewMode) => void }) {
  const fx = 55; const fy = 80; const fw = 340; const fh = 120;
  const dx = 75; const dy = -55;

  const CAMERA_MODES: { mode: ViewMode; icon: React.ElementType; label: string }[] = [
    { mode: "Önden", icon: Eye, label: "Önden" },
    { mode: "Yandan", icon: MoveHorizontal, label: "Yandan" },
    { mode: "Üstten", icon: MoveVertical, label: "Üstten" },
  ];

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden bg-zinc-100">
      {/* Camera controls */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-white border border-zinc-200 rounded-lg p-1 shadow-sm z-10">
        {CAMERA_MODES.map(({ mode, icon: Icon, label }) => (
          <button
            key={mode}
            onClick={() => onViewChange(mode)}
            title={label}
            className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${
              viewMode === mode
                ? "bg-zinc-900 text-white"
                : "text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
            }`}
          >
            <Icon className="w-3.5 h-3.5" strokeWidth={2} />
          </button>
        ))}
      </div>

      {/* SVG Container */}
      <svg
        viewBox="0 0 530 250"
        className="w-full max-w-[660px] h-auto relative z-10"
        style={{ filter: "drop-shadow(0 8px 40px rgba(0,0,0,0.13))" }}
      >
        <defs>
          <clipPath id="frontClip2">
            <rect x={fx} y={fy} width={fw} height={fh} />
          </clipPath>
          <linearGradient id="topG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#a1a1aa" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#71717a" stopOpacity="0.35" />
          </linearGradient>
          <linearGradient id="rightG" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#52525b" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#3f3f46" stopOpacity="0.18" />
          </linearGradient>
          <linearGradient id="frontG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#f4f4f5" stopOpacity="0.92" />
            <stop offset="100%" stopColor="#e4e4e7" stopOpacity="0.88" />
          </linearGradient>
        </defs>

        {/* Ground shadow */}
        <ellipse cx="272" cy="238" rx="240" ry="9" fill="rgba(0,0,0,0.07)" />

        {/* Back face */}
        <polygon
          points={`${fx+dx},${fy+dy} ${fx+fw+dx},${fy+dy} ${fx+fw+dx},${fy+fh+dy} ${fx+dx},${fy+fh+dy}`}
          fill="rgba(228,228,231,0.5)"
          stroke="#a1a1aa"
          strokeWidth="1"
          strokeDasharray="5,4"
        />

        {/* Top face */}
        <polygon
          points={`${fx},${fy} ${fx+fw},${fy} ${fx+fw+dx},${fy+dy} ${fx+dx},${fy+dy}`}
          fill="url(#topG)"
          stroke="#71717a"
          strokeWidth="1.2"
        />

        {/* Right face */}
        <polygon
          points={`${fx+fw},${fy} ${fx+fw+dx},${fy+dy} ${fx+fw+dx},${fy+fh+dy} ${fx+fw},${fy+fh}`}
          fill="url(#rightG)"
          stroke="#71717a"
          strokeWidth="1.2"
        />

        {/* Front face */}
        <rect x={fx} y={fy} width={fw} height={fh} fill="url(#frontG)" />

        {/* Front face load slices (mock — first 70%) */}
        <g clipPath="url(#frontClip2)">
          {/* Loaded fill — indigo zone */}
          <rect x={fx}       y={fy} width={95}  height={fh} fill="rgba(99,102,241,0.18)" />
          {/* Loaded fill — sky zone */}
          <rect x={fx+95}    y={fy} width={120} height={fh} fill="rgba(14,165,233,0.15)" />
          {/* Loaded fill — amber zone */}
          <rect x={fx+215}   y={fy} width={55}  height={fh} fill="rgba(245,158,11,0.15)" />
          {/* Dividers */}
          <line x1={fx+95}  y1={fy} x2={fx+95}  y2={fy+fh} stroke="rgba(0,0,0,0.08)" strokeWidth="0.8" />
          <line x1={fx+215} y1={fy} x2={fx+215} y2={fy+fh} stroke="rgba(0,0,0,0.08)" strokeWidth="0.8" />
          {/* Shelf lines */}
          <line x1={fx} y1={fy+fh*0.38} x2={fx+270} y2={fy+fh*0.38} stroke="rgba(0,0,0,0.04)" strokeWidth="0.5" />
          <line x1={fx} y1={fy+fh*0.68} x2={fx+270} y2={fy+fh*0.68} stroke="rgba(0,0,0,0.04)" strokeWidth="0.5" />
        </g>

        {/* Front face border */}
        <rect x={fx} y={fy} width={fw} height={fh} fill="none" stroke="#71717a" strokeWidth="1.5" />

        {/* Structural ribs */}
        {[85, 170, 255].map((o, i) => (
          <line
            key={i}
            x1={fx+o} y1={fy}
            x2={fx+o} y2={fy+fh}
            stroke="#a1a1aa"
            strokeWidth="0.6"
            opacity="0.6"
          />
        ))}

        {/* Left depth edge */}
        <line x1={fx} y1={fy}    x2={fx+dx} y2={fy+dy}    stroke="#71717a" strokeWidth="1.2" />
        <line x1={fx} y1={fy+fh} x2={fx+dx} y2={fy+fh+dy} stroke="#a1a1aa" strokeWidth="1" strokeDasharray="5,4" />

        {/* Corner dots */}
        {[[fx,fy],[fx+fw,fy],[fx,fy+fh],[fx+fw,fy+fh]].map(([cx,cy],i) => (
          <circle key={i} cx={cx} cy={cy} r="3" fill="#71717a" opacity="0.7" />
        ))}

        {/* Fill label on top face */}
        <text
          x={fx+dx+fw/2-10}
          y={fy+dy-8}
          textAnchor="middle"
          fill="#71717a"
          fontSize="9.5"
          fontFamily="monospace"
        >
          %70 dolu · 46 / 83 ürün
        </text>

        {/* Three.js placeholder label on right face */}
        <text
          x={fx+fw+dx/2+4}
          y={fy+fh/2+dy/2+2}
          textAnchor="middle"
          fill="#a1a1aa"
          fontSize="7.5"
          fontFamily="monospace"
          transform={`rotate(-28, ${fx+fw+dx/2+4}, ${fy+fh/2+dy/2+2})`}
          opacity="0.7"
        >
          three.js
        </text>
      </svg>
    </div>
  );
}

// ─── Left Panel — Ürünler ──────────────────────────────────────────────────────

const INITIAL_GRUPLAR: Grup[] = [
  { id: "G1", ad: "Grup A", acik: true,  urunIdler: ["U1", "U2"] },
  { id: "G2", ad: "Grup B", acik: false, urunIdler: ["U4", "U5"] },
];

function UrunlerPanel() {
  const [gruplar, setGruplar]       = useState<Grup[]>(INITIAL_GRUPLAR);
  const [gruplestirilmemis]         = useState<string[]>(["U3", "U6"]);

  const toggleGrup = (id: string) =>
    setGruplar((prev) =>
      prev.map((g) => (g.id === id ? { ...g, acik: !g.acik } : g))
    );

  const getUrun = (id: string) => URUNLER.find((u) => u.id === id)!;

  return (
    <div className="h-full bg-white border border-zinc-200 rounded-xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between shrink-0 border-b border-zinc-100">
        <span className="text-sm text-zinc-800">Ürünler</span>
        <div className="flex items-center gap-1">
          <button
            title="Grup Oluştur"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 transition-colors"
          >
            <FolderPlus className="w-3.5 h-3.5" />
          </button>
          <button
            title="Ürün Ekle"
            className="w-7 h-7 rounded-lg flex items-center justify-center bg-zinc-900 text-white hover:bg-zinc-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 scrollbar-hide">

          {/* ── Gruplar ── */}
          {gruplar.map((g) => (
            <div key={g.id} className="flex flex-col gap-1">
              {/* Group row */}
              <button
                onClick={() => toggleGrup(g.id)}
                className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-zinc-50 transition-colors"
              >
                <ChevronRight
                  className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-150 ${g.acik ? "rotate-90" : ""}`}
                />
                <Layers className="w-4 h-4 text-zinc-400" strokeWidth={2} />
                <span className="text-sm text-zinc-700 flex-1 text-left">{g.ad}</span>
                <span className="text-xs text-zinc-400">
                  {g.urunIdler.reduce((s, id) => s + getUrun(id).adet, 0)} kalem
                </span>
              </button>

              {/* Group products */}
              {g.acik && g.urunIdler.map((uid) => {
                const u = getUrun(uid);
                return (
                  <div
                    key={uid}
                    className="flex items-start gap-2 px-2 py-2 rounded-lg hover:bg-zinc-50 transition-colors group/item"
                  >
                    <GripVertical className="w-3.5 h-3.5 text-zinc-300 group-hover/item:text-zinc-400 shrink-0 cursor-grab mt-0.5" />
                    <div className={`w-2.5 h-2.5 rounded ${u.dotClass} shrink-0 mt-1`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className="text-sm text-zinc-700 truncate">{u.ad}</span>
                        <span className="text-xs text-zinc-400 shrink-0">{u.adet} adet</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-zinc-400">
                        <span>{u.boyut}</span>
                        <span>•</span>
                        <span>{u.agirlik} kg</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}

          {/* ── Gruplanmamış ── */}
          {gruplestirilmemis.length > 0 && (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 px-2 py-2">
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Grupsuz</span>
              </div>
              {gruplestirilmemis.map((uid) => {
                const u = getUrun(uid);
                return (
                  <div
                    key={uid}
                    className="flex items-start gap-2 px-2 py-2 rounded-lg hover:bg-zinc-50 transition-colors group/item"
                  >
                    <GripVertical className="w-3.5 h-3.5 text-zinc-300 group-hover/item:text-zinc-400 shrink-0 cursor-grab mt-0.5" />
                    <div className={`w-2.5 h-2.5 rounded ${u.dotClass} shrink-0 mt-1`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className="text-sm text-zinc-700 truncate">{u.ad}</span>
                        <span className="text-xs text-zinc-400 shrink-0">{u.adet} adet</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-zinc-400">
                        <span>{u.boyut}</span>
                        <span>•</span>
                        <span>{u.agirlik} kg</span>
                      </div>
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

// ─── Right Panel — Araç & Konteyner Seçimi ────────────────────────────────────

function VehicleSelectionPanel({
  selectedIndex,
  onSelect,
}: {
  selectedIndex: number;
  onSelect: (idx: number) => void;
}) {
  const [araclarAcik, setAraclarAcik] = useState(true);

  return (
    <div className="h-full bg-white border border-zinc-200 rounded-xl flex flex-col overflow-hidden">
      {/* Araçlar Section */}
      <div className="shrink-0">
        <button
          onClick={() => setAraclarAcik((v) => !v)}
          className="w-full px-4 py-3 flex items-center justify-between border-b border-zinc-100 hover:bg-zinc-50 transition-colors"
        >
          <span className="text-sm text-zinc-800">Araçlar</span>
          <ChevronRight
            className={`w-4 h-4 text-zinc-400 transition-transform ${araclarAcik ? "rotate-90" : ""}`}
          />
        </button>
        {araclarAcik && (
          <div className="p-2 border-b border-zinc-100">
            <div className="flex flex-col gap-1">
              {ARACLAR.map((a, i) => (
                <button
                  key={a.id}
                  onClick={() => onSelect(i)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-colors ${
                    i === selectedIndex
                      ? "bg-zinc-900 text-white"
                      : "hover:bg-zinc-50 text-zinc-700"
                  }`}
                >
                  {a.tip === "Konteyner"
                    ? <Package className={`w-4 h-4 shrink-0 ${i === selectedIndex ? "text-white" : "text-sky-500"}`} strokeWidth={2} />
                    : <Truck className={`w-4 h-4 shrink-0 ${i === selectedIndex ? "text-white" : "text-zinc-500"}`} strokeWidth={2} />}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${i === selectedIndex ? "text-white" : "text-zinc-800"}`}>{a.ad}</p>
                    <p className={`text-xs ${i === selectedIndex ? "text-zinc-300" : "text-zinc-400"}`}>
                      {a.tip} · {a.id}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Bottom Stats Panel ────────────────────────────────────────────────────────

function StatsPanel({ aracIndex }: { aracIndex: number }) {
  const arac = ARACLAR[aracIndex];
  const toplamAgirlik = URUNLER.reduce((s, u) => s + u.adet * u.agirlik, 0);
  const agirlikYuzde = Math.min(100, Math.round((toplamAgirlik / arac.maxYuk) * 100));
  const hacimYuzde = 70; // mock

  return (
    <div className="grid grid-cols-3 gap-3">
      {/* Araç Bilgisi */}
      <div className="bg-white border border-zinc-200 rounded-xl p-4">
        <p className="text-xs text-zinc-500 mb-3">Araç Bilgisi</p>
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0">
            {arac.tip === "Konteyner"
              ? <Package className="w-4 h-4 text-sky-500" strokeWidth={2} />
              : <Truck className="w-4 h-4 text-zinc-600" strokeWidth={2} />}
          </div>
          <div>
            <p className="text-sm text-zinc-800">{arac.ad}</p>
            <p className="text-xs text-zinc-400">{arac.tip} · {arac.id}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Uzunluk", value: `${arac.ic.u} m` },
            { label: "Genişlik", value: `${arac.ic.g} m` },
            { label: "Yükseklik", value: `${arac.ic.y} m` },
            { label: "Max Yük", value: `${(arac.maxYuk / 1000).toFixed(1)} t` },
          ].map((r) => (
            <div key={r.label} className="bg-zinc-50 rounded-lg px-2.5 py-2">
              <p className="text-xs text-zinc-400 mb-0.5">{r.label}</p>
              <p className="text-sm text-zinc-700">{r.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* İstatistikler */}
      <div className="bg-white border border-zinc-200 rounded-xl p-4">
        <p className="text-xs text-zinc-500 mb-3">İstatistikler</p>
        <div className="flex items-end justify-between mb-1.5">
          <span className="text-xs text-zinc-500">Hacim Kullanımı</span>
          <span className="text-sm text-zinc-800">%{hacimYuzde}</span>
        </div>
        <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden mb-3">
          <div
            className={`h-full rounded-full ${hacimYuzde > 85 ? "bg-rose-500" : "bg-zinc-700"}`}
            style={{ width: `${hacimYuzde}%` }}
          />
        </div>
        <div className="flex items-end justify-between mb-1.5">
          <span className="text-xs text-zinc-500">Ağırlık · {(toplamAgirlik / 1000).toFixed(1)} t</span>
          <span className="text-sm text-zinc-800">%{agirlikYuzde}</span>
        </div>
        <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${agirlikYuzde > 90 ? "bg-rose-500" : "bg-zinc-500"}`}
            style={{ width: `${agirlikYuzde}%` }}
          />
        </div>
      </div>

      {/* Ağırlık Merkezi */}
      <div className="bg-white border border-zinc-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-zinc-500">Ağırlık Merkezi</p>
          <span className="inline-flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
            <CheckCircle2 className="w-3 h-3" />
            Normal
          </span>
        </div>
        <div className="flex flex-col gap-1.5">
          {[
            { label: "Öne kaydırma (X)", value: "-3.4%" },
            { label: "Yana kaydırma (Z)", value: "+1.6%" },
            { label: "Önden mesafe", value: "264 cm" },
            { label: "Yükseklik", value: "155 cm" },
          ].map((r) => (
            <div key={r.label} className="flex items-center justify-between py-1 border-b border-zinc-100 last:border-0">
              <span className="text-xs text-zinc-400">{r.label}</span>
              <span className="text-sm text-zinc-600">{r.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Player Controls ───────────────────────────────────────────────────────────

function PlayerControls({
  isPlaying,
  onPlay,
  onPause,
}: {
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
}) {
  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-4">
      {/* Media controls */}
      <div className="flex items-center justify-center gap-2">
        <button className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors">
          <ChevronsLeft className="w-4 h-4" />
        </button>
        <button className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors">
          <SkipBack className="w-4 h-4" />
        </button>
        <button
          onClick={isPlaying ? onPause : onPlay}
          className="w-10 h-10 rounded-full bg-zinc-900 text-white flex items-center justify-center hover:bg-zinc-700 transition-colors shadow-md mx-1"
        >
          {isPlaying
            ? <Pause className="w-4 h-4" strokeWidth={2.5} />
            : <Play className="w-4 h-4 ml-0.5" strokeWidth={2.5} />}
        </button>
        <button className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors">
          <SkipForward className="w-4 h-4" />
        </button>
        <button className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors">
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function YuklemePlaniOlustur() {
  const [viewMode, setViewMode] = useState<ViewMode>("Önden");
  const [isPlaying, setIsPlaying] = useState(false);
  const [aracIndex, setAracIndex] = useState(0);

  return (
    <div className="flex h-full bg-zinc-100 overflow-hidden p-3 gap-3">

      {/* Left Panel — Ürünler */}
      <div className="w-[280px] shrink-0">
        <UrunlerPanel />
      </div>

      {/* Center — Viewport + Stats */}
      <div className="flex-1 flex flex-col gap-3 overflow-hidden">
        {/* 3D Viewport */}
        <div className="flex-1 overflow-hidden">
          <Container3DView viewMode={viewMode} onViewChange={setViewMode} />
        </div>
        {/* Bottom Stats */}
        <div className="shrink-0">
          <StatsPanel aracIndex={aracIndex} />
        </div>
      </div>

      {/* Right Panel — Araç Seçimi + Controls */}
      <div className="w-[280px] shrink-0 flex flex-col gap-3">
        {/* Vehicle Selection */}
        <div className="flex-1 overflow-hidden">
          <VehicleSelectionPanel selectedIndex={aracIndex} onSelect={setAracIndex} />
        </div>
        {/* Player Controls */}
        <div className="shrink-0">
          <PlayerControls
            isPlaying={isPlaying}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
        </div>
      </div>
    </div>
  );
}
