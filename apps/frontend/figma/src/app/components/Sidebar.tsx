import React, { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router";
import {
  LayoutDashboard,
  Package,
  Truck,
  BarChart3,
  Settings,
  Bell,
  Waypoints,
  ChevronLeft,
  ChevronRight,
  Plug,
  UserCircle,
  ClipboardList,
  Plus,
} from "lucide-react";

// Nav items that open pages
const mainNavItems = [
  { icon: LayoutDashboard, label: "Genel Bakış",      path: "/",                end: true  },
  { icon: ClipboardList,   label: "Yükleme Planları", path: "/yukleme-planlari",end: false },
  { icon: Package,         label: "Ürün Yönetimi",    path: "/urun-yonetimi",   end: false },
  { icon: Truck,           label: "Araç Yönetimi",    path: "/arac-yonetimi",   end: false },
  { icon: BarChart3,       label: "Raporlama",        path: "/raporlama",       end: false },
  { icon: Plug,            label: "Entegrasyonlar",   path: "/entegrasyonlar",  end: false },
];

const bottomNavItems = [
  { icon: Bell, label: "Bildirimler", path: "/bildirimler", end: false },
  { icon: Settings, label: "Ayarlar", path: "/ayarlar", end: false },
];

interface NavItemProps {
  icon: React.ElementType;
  label: string;
  path: string;
  end: boolean;
  collapsed: boolean;
}

function NavItem({ icon: Icon, label, path, end, collapsed }: NavItemProps) {
  const location = useLocation();
  const isActive = end
    ? location.pathname === path
    : location.pathname === path || location.pathname.startsWith(path + "/");

  return (
    <NavLink
      to={path}
      end={end}
      title={collapsed ? label : undefined}
      className={`group flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-150 relative h-9 ${
        collapsed ? "justify-center px-0" : "px-3"
      } ${
        isActive
          ? "bg-zinc-100 text-zinc-900"
          : "text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100"
      }`}
    >
      <Icon
        className={`w-4 h-4 shrink-0 ${isActive ? "text-zinc-900" : "text-zinc-400 group-hover:text-zinc-700"}`}
        strokeWidth={isActive ? 2.5 : 2}
      />
      {!collapsed && <span className="flex-1">{label}</span>}
    </NavLink>
  );
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();

  return (
    <aside
      className={`${
        collapsed ? "w-[64px]" : "w-[260px]"
      } relative bg-white flex flex-col h-full shrink-0 border-r border-zinc-200 transition-all duration-200`}
    >
      {/* Collapse / Expand handle on right edge */}
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-white border border-zinc-200 flex items-center justify-center text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 transition-colors shadow-sm"
        title={collapsed ? "Genişlet" : "Daralt"}
      >
        {collapsed ? (
          <ChevronRight className="w-3 h-3" />
        ) : (
          <ChevronLeft className="w-3 h-3" />
        )}
      </button>

      {/* Brand Logo */}
      <div className={`px-3 py-5 border-b border-zinc-200 flex items-center ${collapsed ? "justify-center" : "justify-start"}`}>
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-zinc-900 rounded-xl flex items-center justify-center shrink-0">
              <Waypoints className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <span className="text-zinc-900 tracking-[0.15em] font-bold text-[15px] block leading-none">
                NEXLOG
              </span>
              <span className="text-zinc-500 text-[10px] tracking-widest uppercase block mt-0.5">
                Lojistik Platformu
              </span>
            </div>
          </div>
        ) : (
          <div className="w-9 h-9 bg-zinc-900 rounded-xl flex items-center justify-center shrink-0">
            <Waypoints className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className={`flex-1 py-4 overflow-y-auto flex flex-col gap-4 ${collapsed ? "px-2" : "px-3"}`}>

        {/* Yükleme Planı Oluştur — Action Button */}
        <div>
          <button
            onClick={() => navigate("/yukleme-plani-olustur")}
            title={collapsed ? "Yükleme Planı Oluştur" : undefined}
            className={`w-full flex items-center gap-3 rounded-lg text-sm font-semibold transition-all duration-150 bg-zinc-900 text-white hover:bg-zinc-700 h-9 ${
              collapsed ? "justify-center px-0" : "px-3"
            }`}
          >
            <div className="w-4 h-4 shrink-0 flex items-center justify-center">
              <Plus className="w-4 h-4" strokeWidth={2.5} />
            </div>
            {!collapsed && <span className="flex-1 text-left">Yükleme Planı Oluştur</span>}
          </button>
        </div>

        {/* Main Nav */}
        <div className="space-y-0.5">
          {mainNavItems.map((item) => (
            <NavItem
              key={item.path}
              icon={item.icon}
              label={item.label}
              path={item.path}
              end={item.end}
              collapsed={collapsed}
            />
          ))}
        </div>

        {/* Bottom Nav */}
        <div className="space-y-0.5 mt-auto">
          {bottomNavItems.map((item) => (
            <NavItem
              key={item.path}
              icon={item.icon}
              label={item.label}
              path={item.path}
              end={item.end}
              collapsed={collapsed}
            />
          ))}
        </div>

      </nav>

      {/* User Profile */}
      <div className={`pb-4 pt-2 border-t border-zinc-200 ${collapsed ? "px-2" : "px-3"}`}>
        {collapsed ? (
          <div className="flex justify-center py-2">
            <div
              className="w-8 h-8 bg-gradient-to-br from-zinc-600 to-zinc-800 rounded-full flex items-center justify-center shrink-0 border border-zinc-400 cursor-pointer"
              title="Ahmet Yılmaz"
            >
              <span className="text-white text-xs font-semibold">AY</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-zinc-100 cursor-pointer transition-colors group">
            <div className="w-8 h-8 bg-gradient-to-br from-zinc-600 to-zinc-800 rounded-full flex items-center justify-center shrink-0 border border-zinc-400">
              <span className="text-white text-xs font-semibold">AY</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-zinc-800 font-medium truncate leading-none mb-0.5">
                Ahmet Yılmaz
              </p>
              <p className="text-xs text-zinc-500 truncate">Operasyon Müdürü</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}