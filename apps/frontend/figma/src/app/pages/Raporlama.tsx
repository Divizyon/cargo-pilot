import React from "react";
import { BarChart3, Download, TrendingUp, TrendingDown, Calendar, FileText } from "lucide-react";

const raporlar = [
  { ad: "Aylık Operasyon Özeti", tarih: "Nisan 2026", tip: "Operasyon", boyut: "2.4 MB", format: "PDF" },
  { ad: "Araç Verimlilik Raporu", tarih: "Nisan 2026", tip: "Filo", boyut: "1.1 MB", format: "XLSX" },
  { ad: "Müşteri Teslimat Analizi", tarih: "Mart 2026", tip: "Müşteri", boyut: "3.2 MB", format: "PDF" },
  { ad: "Yakıt Tüketim Raporu", tarih: "Mart 2026", tip: "Maliyet", boyut: "0.8 MB", format: "XLSX" },
  { ad: "Rota Performans Karşılaştırması", tarih: "Şubat 2026", tip: "Rota", boyut: "1.7 MB", format: "PDF" },
];

const metrikler = [
  { label: "Bu Ay Teslimat", value: "1,247", trend: "+8.2%", up: true },
  { label: "Ort. Teslim Süresi", value: "2.4 gün", trend: "-0.3 gün", up: true },
  { label: "Yakıt Maliyeti", value: "₺284K", trend: "+3.2%", up: false },
  { label: "Müşteri Memnuniyeti", value: "%97.1", trend: "+1.4 puan", up: true },
];

export function Raporlama() {
  return (
    <div className="p-6 min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 tracking-tight">Raporlama</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Operasyon analizi ve performans raporları</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-zinc-200 bg-white text-zinc-600 text-sm font-medium hover:bg-zinc-50 transition-colors">
            <Calendar className="w-3.5 h-3.5" />
            Nisan 2026
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-950 text-white text-sm font-medium hover:bg-zinc-800 transition-colors">
            <Download className="w-3.5 h-3.5" />
            Rapor Oluştur
          </button>
        </div>
      </div>

      {/* Metrik Kartları */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {metrikler.map((m) => (
          <div key={m.label} className="bg-white rounded-2xl border border-zinc-200/80 p-5">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">{m.label}</p>
            <p className="text-2xl font-bold text-zinc-900 leading-none">{m.value}</p>
            <div className="flex items-center gap-1 mt-2">
              {m.up ? (
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
              )}
              <span className={`text-xs font-semibold ${m.up ? "text-emerald-600" : "text-rose-600"}`}>{m.trend}</span>
              <span className="text-xs text-zinc-400">bu ay</span>
            </div>
          </div>
        ))}
      </div>

      {/* Bar Chart (SVG) */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 mb-4">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-sm font-bold text-zinc-900">Aylık Sevkiyat Hacmi</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Son 6 ay karşılaştırmalı görünüm</p>
          </div>
          <BarChart3 className="w-4 h-4 text-zinc-400" />
        </div>
        <MonthlyBarChart />
      </div>

      {/* Raporlar Listesi */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-100">
          <h2 className="text-sm font-bold text-zinc-900">Oluşturulan Raporlar</h2>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-100">
              {["Rapor Adı", "Dönem", "Tip", "Format", "Boyut", ""].map((h) => (
                <th key={h} className="text-left text-[10px] font-semibold text-zinc-400 uppercase tracking-widest px-5 py-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50">
            {raporlar.map((r) => (
              <tr key={r.ad} className="hover:bg-zinc-50/80 transition-colors cursor-pointer group">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <FileText className="w-3.5 h-3.5 text-zinc-400" />
                    <span className="text-xs font-medium text-zinc-800">{r.ad}</span>
                  </div>
                </td>
                <td className="px-5 py-3.5"><span className="text-xs text-zinc-500">{r.tarih}</span></td>
                <td className="px-5 py-3.5">
                  <span className="text-xs font-medium px-2 py-0.5 bg-zinc-100 text-zinc-600 rounded-md border border-zinc-200">{r.tip}</span>
                </td>
                <td className="px-5 py-3.5">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${r.format === "PDF" ? "bg-rose-50 text-rose-600 border border-rose-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"}`}>{r.format}</span>
                </td>
                <td className="px-5 py-3.5"><span className="text-xs text-zinc-500">{r.boyut}</span></td>
                <td className="px-5 py-3.5">
                  <button className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-800">
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MonthlyBarChart() {
  const data = [
    { ay: "Kas", deger: 980 },
    { ay: "Ara", deger: 1050 },
    { ay: "Oca", deger: 1120 },
    { ay: "Şub", deger: 1090 },
    { ay: "Mar", deger: 1180 },
    { ay: "Nis", deger: 1247 },
  ];
  const VW = 760, VH = 160;
  const pL = 32, pR = 10, pT = 10, pB = 28;
  const plotW = VW - pL - pR;
  const plotH = VH - pT - pB;
  const maxV = 1400;
  const barW = (plotW / data.length) * 0.5;
  const xPos = (i: number) => pL + (i + 0.5) * (plotW / data.length);
  const yPos = (v: number) => pT + plotH - (v / maxV) * plotH;

  return (
    <svg width="100%" height={VH} viewBox={`0 0 ${VW} ${VH}`}>
      {[0, 400, 800, 1200].map((v) => (
        <g key={v}>
          <line x1={pL} y1={yPos(v)} x2={VW - pR} y2={yPos(v)} stroke="#f4f4f5" strokeDasharray="3 3" />
          <text x={pL - 4} y={yPos(v) + 4} textAnchor="end" fill="#a1a1aa" fontSize={10} fontFamily="Plus Jakarta Sans">{v === 0 ? "0" : `${v}`}</text>
        </g>
      ))}
      {data.map((d, i) => (
        <g key={d.ay}>
          <rect
            x={xPos(i) - barW / 2}
            y={yPos(d.deger)}
            width={barW}
            height={plotH - (yPos(d.deger) - pT)}
            rx={4}
            fill={i === data.length - 1 ? "#18181b" : "#e4e4e7"}
          />
          <text x={xPos(i)} y={VH - 6} textAnchor="middle" fill="#a1a1aa" fontSize={11} fontFamily="Plus Jakarta Sans">{d.ay}</text>
          {i === data.length - 1 && (
            <text x={xPos(i)} y={yPos(d.deger) - 6} textAnchor="middle" fill="#18181b" fontSize={11} fontFamily="Plus Jakarta Sans" fontWeight="600">
              {d.deger}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}
