import { Truck } from "lucide-react";

export function AracTakibi() {
  return (
    <div className="p-6 min-h-full">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-zinc-900 tracking-tight">Araç Takibi</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Filo araçlarını gerçek zamanlı takip edin</p>
      </div>
      <div className="bg-white rounded-2xl border border-zinc-200 p-16 flex flex-col items-center justify-center text-center">
        <div className="w-14 h-14 bg-zinc-100 rounded-2xl flex items-center justify-center mb-4">
          <Truck className="w-7 h-7 text-zinc-400" />
        </div>
        <h2 className="text-base font-semibold text-zinc-700 mb-1">Araç Takibi Modülü</h2>
        <p className="text-sm text-zinc-400 max-w-sm">Harita görünümü ve canlı araç konumları yakında burada olacak.</p>
      </div>
    </div>
  );
}
