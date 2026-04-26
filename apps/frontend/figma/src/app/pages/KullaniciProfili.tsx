import React from "react";
import { User, Mail, Phone, Building2, Shield, Bell, Key, Camera, CheckCircle2 } from "lucide-react";

const aktiviteler = [
  { eylem: "Sisteme giriş yapıldı", zaman: "Bugün, 09:14", icon: CheckCircle2, renk: "text-emerald-500" },
  { eylem: "Yükleme planı oluşturuldu (#YP-0892)", zaman: "Bugün, 09:22", icon: CheckCircle2, renk: "text-emerald-500" },
  { eylem: "Araç 34 TK 892 bakım kaydı açıldı", zaman: "Dün, 16:40", icon: CheckCircle2, renk: "text-emerald-500" },
  { eylem: "Aylık rapor dışa aktarıldı", zaman: "Dün, 14:05", icon: CheckCircle2, renk: "text-emerald-500" },
];

export function KullaniciProfili() {
  return (
    <div className="p-6 min-h-full">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-zinc-900 tracking-tight">Kullanıcı Profili</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Hesap bilgileri ve tercihler</p>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Sol: Profil Kartı */}
        <div className="col-span-4 flex flex-col gap-4">
          <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 flex flex-col items-center text-center">
            <div className="relative mb-4">
              <div className="w-20 h-20 bg-gradient-to-br from-zinc-600 to-zinc-900 rounded-2xl flex items-center justify-center">
                <span className="text-white text-2xl font-bold">AY</span>
              </div>
              <button className="absolute -bottom-1 -right-1 w-7 h-7 bg-white border border-zinc-200 rounded-lg flex items-center justify-center hover:bg-zinc-50 transition-colors shadow-sm">
                <Camera className="w-3.5 h-3.5 text-zinc-500" />
              </button>
            </div>
            <p className="text-base font-bold text-zinc-900">Ahmet Yılmaz</p>
            <p className="text-xs text-zinc-500 mt-0.5">Operasyon Müdürü</p>
            <div className="flex items-center gap-1.5 mt-3 px-2.5 py-1 bg-emerald-50 rounded-full border border-emerald-200">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
              <span className="text-[11px] text-emerald-700 font-semibold">Aktif</span>
            </div>

            <div className="w-full mt-5 pt-5 border-t border-zinc-100 space-y-3 text-left">
              {[
                { icon: Mail, label: "E-posta", value: "a.yilmaz@nexlog.com.tr" },
                { icon: Phone, label: "Telefon", value: "+90 532 xxx xx xx" },
                { icon: Building2, label: "Departman", value: "Operasyon" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <div className="w-7 h-7 bg-zinc-100 rounded-lg flex items-center justify-center shrink-0">
                    <item.icon className="w-3.5 h-3.5 text-zinc-500" />
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-semibold">{item.label}</p>
                    <p className="text-xs text-zinc-700 font-medium">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Rol & İzinler */}
          <div className="bg-white rounded-2xl border border-zinc-200/80 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-4 h-4 text-zinc-500" />
              <h2 className="text-sm font-bold text-zinc-900">Rol & İzinler</h2>
            </div>
            <div className="space-y-2">
              {["Sevkiyat Yönetimi", "Araç Yönetimi", "Rapor Görüntüleme", "Kullanıcı Yönetimi"].map((izin) => (
                <div key={izin} className="flex items-center justify-between py-1.5">
                  <span className="text-xs text-zinc-600">{izin}</span>
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">İzinli</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sağ: Ayarlar & Aktivite */}
        <div className="col-span-8 flex flex-col gap-4">
          {/* Bilgileri Düzenle */}
          <div className="bg-white rounded-2xl border border-zinc-200/80 p-5">
            <div className="flex items-center gap-2 mb-5">
              <User className="w-4 h-4 text-zinc-500" />
              <h2 className="text-sm font-bold text-zinc-900">Kişisel Bilgiler</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Ad", value: "Ahmet" },
                { label: "Soyad", value: "Yılmaz" },
                { label: "E-posta", value: "a.yilmaz@nexlog.com.tr" },
                { label: "Telefon", value: "+90 532 xxx xx xx" },
                { label: "Unvan", value: "Operasyon Müdürü" },
                { label: "Departman", value: "Operasyon" },
              ].map((f) => (
                <div key={f.label}>
                  <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest block mb-1.5">{f.label}</label>
                  <input
                    type="text"
                    defaultValue={f.value}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-700 focus:outline-none focus:border-zinc-400 transition-colors"
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end mt-5 pt-4 border-t border-zinc-100">
              <button className="px-4 py-2 rounded-lg bg-zinc-950 text-white text-xs font-medium hover:bg-zinc-800 transition-colors">
                Değişiklikleri Kaydet
              </button>
            </div>
          </div>

          {/* Bildirim Tercihleri */}
          <div className="bg-white rounded-2xl border border-zinc-200/80 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Bell className="w-4 h-4 text-zinc-500" />
              <h2 className="text-sm font-bold text-zinc-900">Bildirim Tercihleri</h2>
            </div>
            <div className="space-y-3">
              {[
                { label: "Sevkiyat güncellemeleri", acik: true },
                { label: "Araç bakım uyarıları", acik: true },
                { label: "Müşteri onay talepleri", acik: true },
                { label: "Haftalık özet raporu", acik: false },
              ].map((n) => (
                <div key={n.label} className="flex items-center justify-between py-1.5 border-b border-zinc-50 last:border-0">
                  <span className="text-xs text-zinc-700">{n.label}</span>
                  <div className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${n.acik ? "bg-zinc-900" : "bg-zinc-200"}`}>
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${n.acik ? "left-4" : "left-0.5"}`} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Son Aktiviteler */}
          <div className="bg-white rounded-2xl border border-zinc-200/80 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Key className="w-4 h-4 text-zinc-500" />
              <h2 className="text-sm font-bold text-zinc-900">Son Aktiviteler</h2>
            </div>
            <div className="space-y-3">
              {aktiviteler.map((a, i) => (
                <div key={i} className="flex items-center gap-3">
                  <a.icon className={`w-3.5 h-3.5 shrink-0 ${a.renk}`} />
                  <div className="flex-1">
                    <p className="text-xs text-zinc-700">{a.eylem}</p>
                  </div>
                  <span className="text-[11px] text-zinc-400 shrink-0">{a.zaman}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
