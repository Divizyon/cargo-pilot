import React from "react";
import { Outlet, NavLink, useLocation } from "react-router";
import {
  Waypoints,
  LayoutDashboard,
  Package,
  Truck,
  BarChart3,
  Plug,
  Bell,
  Settings,
  ClipboardList,
  Plus,
} from "lucide-react";

const mainNavItems = [
  { icon: LayoutDashboard, label: "Genel Bakış",      path: "/",                end: true  },
  { icon: ClipboardList,   label: "Yükleme Planları", path: "/yukleme-planlari",end: false },
  { icon: Package,         label: "Ürün Yönetimi",    path: "/urun-yonetimi",   end: false },
  { icon: Truck,           label: "Araç Yönetimi",    path: "/arac-yonetimi",   end: false },
  { icon: BarChart3,       label: "Raporlama",        path: "/raporlama",       end: false },
  { icon: Plug,            label: "Entegrasyonlar",   path: "/entegrasyonlar",  end: false },
];

const bottomNavItems = [
  { icon: Bell,     label: "Bildirimler", path: "/bildirimler", end: false },
  { icon: Settings, label: "Ayarlar",     path: "/ayarlar",     end: false },
];

function LockedNavItem({
  icon: Icon,
  label,
  path,
  end,
}: {
  icon: React.ElementType;
  label: string;
  path: string;
  end: boolean;
}) {
  const location = useLocation();
  const isActive = end
    ? location.pathname === path
    : location.pathname === path || location.pathname.startsWith(path + "/");

  return (
    <NavLink
      to={path}
      end={end}
      title={label}
      className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
        isActive
          ? "bg-zinc-100 text-zinc-900"
          : "text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
      }`}
    >
      <Icon className="w-4 h-4" strokeWidth={isActive ? 2.5 : 2} />
    </NavLink>
  );
}

export function YuklemePlaniLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50">
      {/* ── Locked Collapsed Sidebar ── */}
      <aside className="w-[64px] bg-white flex flex-col h-full shrink-0 border-r border-zinc-200">
        {/* Logo */}
        <div className="h-[68px] border-b border-zinc-200 flex items-center justify-center shrink-0">
          <div className="w-9 h-9 bg-zinc-900 rounded-xl flex items-center justify-center">
            <Waypoints className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
        </div>

        {/* New Plan button (active state — locked) */}
        <div className="px-[12px] pt-4 pb-2 shrink-0">
          <button
            title="Yükleme Planı Oluştur"
            className="w-9 h-9 rounded-lg bg-zinc-900 text-white flex items-center justify-center hover:bg-zinc-700 transition-colors"
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </div>

        {/* Main Nav */}
        <nav className="flex-1 px-[12px] py-2 flex flex-col gap-0.5 overflow-y-auto">
          {mainNavItems.map((item) => (
            <LockedNavItem key={item.path} {...item} />
          ))}
        </nav>

        {/* Bottom */}
        <div className="px-[12px] py-3 border-t border-zinc-200 flex flex-col gap-0.5 items-center shrink-0">
          {bottomNavItems.map((item) => (
            <LockedNavItem key={item.path} {...item} />
          ))}
          <div
            className="mt-2 w-8 h-8 bg-gradient-to-br from-zinc-600 to-zinc-800 rounded-full flex items-center justify-center border border-zinc-400 cursor-pointer shrink-0"
            title="Ahmet Yılmaz"
          >
            <span className="text-white text-xs font-semibold">AY</span>
          </div>
        </div>
      </aside>

      {/* Page content */}
      <main className="flex-1 overflow-hidden flex flex-col">
        <Outlet />
      </main>
    </div>
  );
}