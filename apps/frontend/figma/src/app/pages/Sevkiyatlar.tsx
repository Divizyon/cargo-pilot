import { Package, Plus, Filter, Search, Download } from "lucide-react";

export function Sevkiyatlar() {
  return (
    <div className="p-6 min-h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 tracking-tight">Sevkiyatlar</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Tüm sevkiyat kayıtlarını görüntüleyin ve yönetin</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-950 text-white text-sm font-medium hover:bg-zinc-800 transition-colors">
          <Plus className="w-3.5 h-3.5" />
          Yeni Sevkiyat
        </button>
      </div>
      <div className="bg-white rounded-2xl border border-zinc-200 p-16 flex flex-col items-center justify-center text-center">
        <div className="w-14 h-14 bg-zinc-100 rounded-2xl flex items-center justify-center mb-4">
          <Package className="w-7 h-7 text-zinc-400" />
        </div>
        <h2 className="text-base font-semibold text-zinc-700 mb-1">Sevkiyatlar Modülü</h2>
        <p className="text-sm text-zinc-400 max-w-sm">Bu sayfa geliştirme aşamasındadır. Sevkiyat listesi, detay sayfaları ve yönetim araçları yakında burada olacak.</p>
      </div>
    </div>
  );
}
