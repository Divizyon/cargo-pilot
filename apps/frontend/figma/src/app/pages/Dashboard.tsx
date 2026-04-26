import React, { useState } from "react";
import {
  Package,
  Truck,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

// ─── Mock Data ────────────────────────────────────────────────────────────────

const weeklyData = [
  { gun: "Pzt", sevkiyat: 142, teslim: 128 },
  { gun: "Sal", sevkiyat: 158, teslim: 149 },
  { gun: "Çar", sevkiyat: 167, teslim: 155 },
  { gun: "Per", sevkiyat: 145, teslim: 138 },
  { gun: "Cum", sevkiyat: 189, teslim: 176 },
  { gun: "Cmt", sevkiyat: 132, teslim: 124 },
  { gun: "Paz", sevkiyat: 98, teslim: 92 },
];

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string;
  sub: string;
  trend: string;
  trendUp: boolean;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
}

function KpiCard({ label, value, sub, trend, trendUp, icon: Icon, iconBg, iconColor }: KpiCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 flex flex-col gap-4 hover:border-zinc-300 transition-colors">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">{label}</span>
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${iconBg}`}>
          <Icon className={`w-4 h-4 ${iconColor}`} strokeWidth={2.5} />
        </div>
      </div>
      <div>
        <p className="text-3xl font-bold text-zinc-900 leading-none tracking-tight">{value}</p>
        <p className="text-xs text-zinc-400 mt-1.5">{sub}</p>
      </div>
      <div className="flex items-center gap-1.5">
        {trendUp ? (
          <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
        ) : (
          <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
        )}
        <span className={`text-xs font-semibold ${trendUp ? "text-emerald-600" : "text-rose-600"}`}>
          {trend}
        </span>
        <span className="text-xs text-zinc-400">bu ay</span>
      </div>
    </div>
  );
}

// ─── Weekly Area Chart (pure SVG) ────────────────────────────────────────────

function WeeklyAreaChart({ data }: { data: { gun: string; sevkiyat: number; teslim: number }[] }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const VW = 900, VH = 260;
  const pL = 40, pR = 20, pT = 16, pB = 32;
  const plotW = VW - pL - pR;
  const plotH = VH - pT - pB;

  const allVals = data.flatMap((d) => [d.sevkiyat, d.teslim]);
  const rawMax = Math.max(...allVals);
  const maxV = Math.ceil(rawMax / 50) * 50;
  const minV = 0;

  const xPos = (i: number) => pL + (i / (data.length - 1)) * plotW;
  const yPos = (v: number) => pT + plotH - ((v - minV) / (maxV - minV)) * plotH;

  const linePath = (key: "sevkiyat" | "teslim") =>
    data.map((d, i) => `${i === 0 ? "M" : "L"}${xPos(i).toFixed(1)},${yPos(d[key]).toFixed(1)}`).join(" ");

  const areaPath = (key: "sevkiyat" | "teslim") =>
    `${linePath(key)} L${xPos(data.length - 1).toFixed(1)},${(pT + plotH).toFixed(1)} L${xPos(0).toFixed(1)},${(pT + plotH).toFixed(1)} Z`;

  const gridVals = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * maxV));
  const colW = plotW / data.length;

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${VW} ${VH}`}
      preserveAspectRatio="none"
      style={{ display: "block" }}
      onMouseLeave={() => setHoverIdx(null)}
    >
      {/* Grid lines */}
      {gridVals.map((v, i) => (
        <g key={`grid-${i}`}>
          <line x1={pL} y1={yPos(v)} x2={VW - pR} y2={yPos(v)} stroke="#f4f4f5" strokeDasharray="4 4" />
          <text x={pL - 6} y={yPos(v) + 4} textAnchor="end" fill="#a1a1aa" fontSize={12} fontFamily="Plus Jakarta Sans">
            {v}
          </text>
        </g>
      ))}

      {/* Area fills */}
      <path d={areaPath("sevkiyat")} fill="#18181b" fillOpacity={0.07} />
      <path d={areaPath("teslim")} fill="#a1a1aa" fillOpacity={0.10} />

      {/* Lines */}
      <path d={linePath("sevkiyat")} fill="none" stroke="#18181b" strokeWidth={2.5} strokeLinejoin="round" />
      <path d={linePath("teslim")} fill="none" stroke="#a1a1aa" strokeWidth={2} strokeLinejoin="round" />

      {/* Hover crosshair + dots */}
      {hoverIdx !== null && (
        <>
          <line
            x1={xPos(hoverIdx)} y1={pT}
            x2={xPos(hoverIdx)} y2={pT + plotH}
            stroke="#e4e4e7" strokeWidth={1} strokeDasharray="4 4"
          />
          <circle cx={xPos(hoverIdx)} cy={yPos(data[hoverIdx].sevkiyat)} r={5} fill="#18181b" />
          <circle cx={xPos(hoverIdx)} cy={yPos(data[hoverIdx].teslim)} r={5} fill="#a1a1aa" />
          {(() => {
            const tx = Math.min(xPos(hoverIdx) + 14, VW - 130);
            const ty = pT + 10;
            return (
              <g>
                <rect x={tx} y={ty} width={120} height={62} rx={8} fill="#09090b" />
                <text x={tx + 12} y={ty + 20} fill="#d4d4d8" fontSize={13} fontFamily="Plus Jakarta Sans" fontWeight="600">
                  {data[hoverIdx].gun}
                </text>
                <text x={tx + 12} y={ty + 38} fill="#a1a1aa" fontSize={12} fontFamily="Plus Jakarta Sans">
                  {"Sevkiyat: "}
                  <tspan fill="white" fontWeight="600">{data[hoverIdx].sevkiyat}</tspan>
                </text>
                <text x={tx + 12} y={ty + 54} fill="#a1a1aa" fontSize={12} fontFamily="Plus Jakarta Sans">
                  {"Teslim: "}
                  <tspan fill="white" fontWeight="600">{data[hoverIdx].teslim}</tspan>
                </text>
              </g>
            );
          })()}
        </>
      )}

      {/* Invisible hover zones */}
      {data.map((d, i) => (
        <rect
          key={`hz-${d.gun}`}
          x={xPos(i) - colW / 2}
          y={pT}
          width={colW}
          height={plotH}
          fill="transparent"
          onMouseEnter={() => setHoverIdx(i)}
        />
      ))}

      {/* X axis labels */}
      {data.map((d, i) => (
        <text
          key={`xl-${d.gun}`}
          x={xPos(i)}
          y={VH - 8}
          textAnchor="middle"
          fill="#a1a1aa"
          fontSize={13}
          fontFamily="Plus Jakarta Sans"
        >
          {d.gun}
        </text>
      ))}
    </svg>
  );
}

// ─── Dashboard Page ───────────────────────────────────────────────────────────

export function Dashboard() {
  return (
    <div className="p-6 min-h-full">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-zinc-900 tracking-tight">Genel Bakış</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Çarşamba, 22 Nisan 2026 · Genel operasyon görünümü</p>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-12 gap-4">

        {/* ── Row 1: KPI Cards (3-column) ── */}
        <div className="col-span-4">
          <KpiCard
            label="Toplam Sevkiyat"
            value="1,247"
            sub="89 aktif · 158 bu hafta"
            trend="+8.2%"
            trendUp={true}
            icon={Package}
            iconBg="bg-zinc-100"
            iconColor="text-zinc-700"
          />
        </div>
        <div className="col-span-4">
          <KpiCard
            label="Aktif Araç"
            value="89"
            sub="112 araç filosundan · %79.4"
            trend="+5 araç"
            trendUp={true}
            icon={Truck}
            iconBg="bg-zinc-100"
            iconColor="text-zinc-700"
          />
        </div>
        <div className="col-span-4">
          <KpiCard
            label="Aylık Ciro"
            value="₺4.2M"
            sub="Hedef: ₺4.8M · %87.5 tamamlandı"
            trend="+12.8%"
            trendUp={true}
            icon={TrendingUp}
            iconBg="bg-zinc-100"
            iconColor="text-zinc-700"
          />
        </div>

        {/* ── Row 2: Full-width Area Chart ── */}
        <div className="col-span-12 bg-white rounded-2xl border border-zinc-200/80 p-5 hover:border-zinc-300 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-zinc-900">Haftalık Sevkiyat Trendi</h2>
              <p className="text-xs text-zinc-400 mt-0.5">Toplam sevkiyat ve teslim karşılaştırması</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-zinc-800 block" />
                <span className="text-xs text-zinc-500">Sevkiyat</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-zinc-300 block" />
                <span className="text-xs text-zinc-500">Teslim</span>
              </div>
            </div>
          </div>
          <div style={{ height: 260 }}>
            <WeeklyAreaChart data={weeklyData} />
          </div>
        </div>

      </div>
    </div>
  );
}
