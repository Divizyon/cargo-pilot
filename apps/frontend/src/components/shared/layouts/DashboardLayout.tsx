import { type ElementType, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Bell,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  DatabaseZap,
  HelpCircle,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  Monitor,
  Package,
  Plus,
  Settings,
  Truck,
  Waypoints,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { useUIStore } from '@/lib/store/useUIStore';
import { useLogout } from '@/lib/api/useAuth';
import { useSessionTimeout } from '@/lib/hooks/useSessionTimeout';
import { SessionTimeoutDialog } from '@/features/platform/components/SessionTimeoutDialog';
import { OnboardingDialog } from '@/features/platform/components/OnboardingDialog';
import { useUsageQuota, isQuotaExceeded } from '@/lib/api/useUsageQuota';
import { ThemeToggle } from '@/components/shared/ThemeToggle';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Below this width the sidebar auto-collapses to icon-only mode. */
const ICON_ONLY_BREAKPOINT = 1280;

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  manager: 'Yönetici',
  viewer: 'Görüntüleyici',
  operator: 'Operatör',
};

interface NavItemDef {
  icon: ElementType;
  label: string;
  path: string;
  end: boolean;
  badge?: number;
}

const MAIN_NAV: NavItemDef[] = [
  { icon: LayoutDashboard, label: 'Genel Bakış', path: '/dashboard', end: true },
  { icon: ClipboardList, label: 'Yükleme Planları', path: '/planning', end: false },
  { icon: Package, label: 'Ürün Yönetimi', path: '/products', end: false },
  { icon: Truck, label: 'Araç Yönetimi', path: '/vehicles', end: false },
  { icon: BarChart3, label: 'Raporlama', path: '/reports', end: false },
  { icon: DatabaseZap, label: 'ERP Ürünleri', path: '/erp', end: false },
];

const BOTTOM_NAV: NavItemDef[] = [
  { icon: Bell, label: 'Bildirimler', path: '/notifications', end: false, badge: 3 },
  { icon: Settings, label: 'Ayarlar', path: '/settings', end: false },
];

// ─── NavItem ──────────────────────────────────────────────────────────────────

interface NavItemProps {
  item: NavItemDef;
  isCollapsed: boolean;
}

function NavItem({ item, isCollapsed }: NavItemProps) {
  const { pathname } = useLocation();
  const isActive = item.end
    ? pathname === item.path
    : pathname === item.path || pathname.startsWith(item.path + '/');

  return (
    <div className="relative">
      {isActive && <div className="absolute left-0 top-1.5 h-6 w-0.5 rounded-r-full bg-primary" />}
      <NavLink
        to={item.path}
        end={item.end}
        title={isCollapsed ? item.label : undefined}
        className={cn(
          'flex h-9 items-center gap-3 rounded-lg text-sm font-medium transition-colors',
          isCollapsed ? 'lg:justify-center lg:px-0 px-3' : 'px-3',
          isActive
            ? 'bg-accent text-accent-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-foreground',
        )}
      >
        <item.icon
          className={cn(
            'h-4 w-4 shrink-0',
            isActive ? 'text-accent-foreground' : 'text-muted-foreground',
          )}
          strokeWidth={isActive ? 2.5 : 2}
        />
        <span className={cn('flex-1', isCollapsed && 'lg:hidden')}>{item.label}</span>
        {item.badge !== undefined && (
          <span
            className={cn(
              'flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground',
              isCollapsed && 'lg:hidden',
            )}
          >
            {item.badge}
          </span>
        )}
      </NavLink>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

interface SidebarProps {
  isCollapsed: boolean;
  onCollapsedChange: (v: boolean) => void;
  toggleLocked?: boolean;
  onClose?: () => void;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function Sidebar({ isCollapsed, onCollapsedChange, toggleLocked = false, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { mutate: logout, isPending: isLoggingOut } = useLogout();
  const { data: quota } = useUsageQuota();
  const planLimitReached = quota ? isQuotaExceeded(quota.plans) : false;

  return (
    <aside
      className={cn(
        'relative flex h-full flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200',
        isCollapsed ? 'lg:w-16' : 'lg:w-64',
        'w-64',
      )}
    >
      {/* Collapse toggle — desktop only */}
      <button
        onClick={() => !toggleLocked && onCollapsedChange(!isCollapsed)}
        disabled={toggleLocked}
        className={cn(
          'absolute -right-3 top-1/2 z-10 hidden h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition-colors lg:flex',
          toggleLocked ? 'opacity-30 cursor-not-allowed' : 'hover:text-foreground',
        )}
        title={toggleLocked ? 'Bu sayfada sidebar kilittli' : isCollapsed ? 'Genişlet' : 'Daralt'}
      >
        {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </button>

      {/* Brand */}
      <div
        className={cn(
          'flex items-center border-b border-sidebar-border px-3 py-5',
          isCollapsed ? 'lg:justify-center' : 'gap-3',
        )}
      >
        <NavLink
          to="/dashboard"
          className={cn(
            'flex min-w-0 flex-1 items-center transition-opacity hover:opacity-80',
            isCollapsed ? 'lg:justify-center' : 'gap-3',
          )}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary">
            <Waypoints className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <div className={cn(isCollapsed && 'lg:hidden')}>
            <span className="block text-[15px] font-bold tracking-[0.15em] text-foreground">
              CARGOPILOT
            </span>
            <span className="block text-[10px] uppercase tracking-widest text-muted-foreground">
              Lojistik Platformu
            </span>
          </div>
        </NavLink>
        <button
          onClick={onClose}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground lg:hidden"
          aria-label="Menüyü kapat"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Navigation */}
      <nav
        className={cn(
          'flex flex-1 flex-col gap-4 overflow-y-auto py-4',
          isCollapsed ? 'lg:px-2 px-3' : 'px-3',
        )}
      >
        {/* Primary CTA */}
        <button
          onClick={() => !planLimitReached && navigate('/planning/new')}
          disabled={planLimitReached}
          title={
            planLimitReached
              ? 'Plan limitinize ulaştınız. Planınızı yükseltin.'
              : isCollapsed
                ? 'Yeni Yükleme Planı'
                : undefined
          }
          className={cn(
            'flex h-9 w-full items-center gap-3 rounded-lg text-sm font-semibold transition-colors',
            isCollapsed ? 'lg:justify-center lg:px-0 px-3' : 'px-3',
            planLimitReached
              ? 'cursor-not-allowed bg-muted text-muted-foreground'
              : 'bg-primary text-primary-foreground hover:bg-primary/90',
          )}
        >
          <Plus className="h-4 w-4 shrink-0" strokeWidth={2.5} />
          <span className={cn('flex-1 text-left', isCollapsed && 'lg:hidden')}>
            Yükleme Planı Oluştur
          </span>
        </button>

        {/* Main nav */}
        <div className="space-y-0.5">
          {MAIN_NAV.map((item) => (
            <NavItem key={item.path} item={item} isCollapsed={isCollapsed} />
          ))}
        </div>

        {/* Bottom nav — above user profile */}
        <div className="mt-auto space-y-0.5">
          {BOTTOM_NAV.map((item) => (
            <NavItem key={item.path} item={item} isCollapsed={isCollapsed} />
          ))}
          {/* Theme toggle row */}
          <div
            className={cn(
              'flex h-9 items-center rounded-lg',
              isCollapsed ? 'lg:justify-center lg:px-0 px-3' : 'px-3 justify-between',
            )}
          >
            <span
              className={cn(
                'text-sm font-medium text-muted-foreground',
                isCollapsed && 'lg:hidden',
              )}
            >
              Tema
            </span>
            <ThemeToggle />
          </div>
        </div>
      </nav>

      {/* User profile */}
      <div
        className={cn(
          'border-t border-sidebar-border pb-4 pt-2',
          isCollapsed ? 'lg:px-2 px-3' : 'px-3',
        )}
      >
        <div
          className={cn(
            'flex items-center rounded-lg transition-colors',
            isCollapsed
              ? 'lg:justify-center py-2'
              : 'gap-3 px-2 py-2.5 hover:bg-sidebar-accent cursor-pointer',
          )}
          onClick={() => navigate('/settings?tab=bireysel-hesap')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && navigate('/settings?tab=bireysel-hesap')}
          title="Hesap ayarları"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
            {user ? getInitials(user.fullName) : '?'}
          </div>
          <div className={cn('min-w-0 flex-1', isCollapsed && 'lg:hidden')}>
            <p className="truncate text-sm font-medium leading-none text-foreground">
              {user?.fullName ?? '—'}
            </p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {user ? (ROLE_LABELS[user.role] ?? user.role) : ''}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              logout();
            }}
            disabled={isLoggingOut}
            title="Çıkış Yap"
            className={cn(
              'h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground',
              isCollapsed && 'lg:hidden',
            )}
          >
            {isLoggingOut ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <LogOut className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>
    </aside>
  );
}

// ─── DashboardLayout ──────────────────────────────────────────────────────────

const FOCUS_ROUTES = ['/planning/new'];
const PLANNING_NON_FOCUS = new Set(['/planning/shares']);

function checkIsFocusRoute(pathname: string): boolean {
  if (FOCUS_ROUTES.some((r) => pathname.startsWith(r))) return true;
  if (/^\/planning\/[^/]+$/.test(pathname) && !PLANNING_NON_FOCUS.has(pathname)) return true;
  return false;
}

const FIXED_HEIGHT_ROUTE_PATTERNS = [
  /^\/products\/new$/,
  /^\/products\/[^/]+\/edit$/,
  /^\/vehicles\/new$/,
  /^\/vehicles\/[^/]+\/edit$/,
];

function checkIsFixedHeightRoute(pathname: string): boolean {
  return FIXED_HEIGHT_ROUTE_PATTERNS.some((p) => p.test(pathname));
}

/** Below this width focus routes show a "not supported on mobile" screen. */
const MOBILE_BREAKPOINT = 768;

function MobileNotSupported() {
  const navigate = useNavigate();
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 bg-page-background p-6 text-center">
      <div className="relative">
        <Monitor className="h-16 w-16 text-muted-foreground/40" strokeWidth={1} />
        <div className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-destructive">
          <X className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
        </div>
      </div>
      <div className="max-w-xs space-y-2">
        <p className="text-base font-semibold text-foreground">
          Bu sayfa mobil cihazlarda desteklenmiyor
        </p>
        <p className="text-sm text-muted-foreground">
          Yükleme planı düzenleyicisi için tablet veya masaüstü bir cihaz kullanın.
        </p>
      </div>
      <button
        onClick={() => navigate('/planning')}
        className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
      >
        Yükleme Planlarına Dön
      </button>
    </div>
  );
}

export function DashboardLayout() {
  const [windowCollapsed, setWindowCollapsed] = useState(false);
  const [isMobileWidth, setIsMobileWidth] = useState(false);
  const [isBelowLg, setIsBelowLg] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { isSidebarOpen, setSidebarOpen } = useUIStore();
  const { showWarning, countdown, extendSession } = useSessionTimeout();
  const { pathname } = useLocation();
  const isFocusRoute = checkIsFocusRoute(pathname);
  const isFixedHeightRoute = checkIsFixedHeightRoute(pathname);
  const isCollapsed = isFocusRoute || windowCollapsed;

  useEffect(() => {
    function syncWidths() {
      setWindowCollapsed(window.innerWidth < ICON_ONLY_BREAKPOINT);
      setIsMobileWidth(window.innerWidth < MOBILE_BREAKPOINT);
      setIsBelowLg(window.innerWidth < 1024);
    }
    syncWidths();
    window.addEventListener('resize', syncWidths);
    return () => window.removeEventListener('resize', syncWidths);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-foreground/20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar: fixed drawer on mobile, static flex item on desktop */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-30 transition-transform duration-200',
          'lg:static lg:z-auto lg:translate-x-0',
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        <Sidebar
          isCollapsed={isCollapsed}
          onCollapsedChange={setWindowCollapsed}
          toggleLocked={isFocusRoute}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      {/* Main content */}
      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Mobile header — non-focus routes always; focus routes on tablet (below lg) */}
        {(!isFocusRoute || isBelowLg) && (
          <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border bg-background px-4 lg:hidden">
            <button
              onClick={() => setSidebarOpen(!isSidebarOpen)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label="Menüyü aç"
            >
              <Menu className="h-5 w-5" />
            </button>
            <NavLink
              to="/dashboard"
              className="flex items-center gap-2 transition-opacity hover:opacity-80"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
                <Waypoints className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
              </div>
              <span className="text-sm font-bold tracking-[0.15em] text-foreground">
                CARGOPILOT
              </span>
            </NavLink>
          </header>
        )}
        <main
          className={cn(
            'flex-1',
            isFocusRoute && !isMobileWidth
              ? 'overflow-hidden'
              : isFixedHeightRoute
                ? 'overflow-hidden bg-page-background p-3 sm:p-4 lg:p-6'
                : 'overflow-auto bg-page-background p-3 sm:p-4 lg:p-6',
          )}
        >
          {isFocusRoute && isMobileWidth ? <MobileNotSupported /> : <Outlet />}
        </main>
      </div>

      {!isFocusRoute && (
        <button
          onClick={() => setShowOnboarding(true)}
          className="absolute right-4 top-3 z-10 hidden h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground lg:flex"
          title="Rehberi tekrar göster"
          aria-label="Rehberi tekrar göster"
        >
          <HelpCircle className="h-5 w-5" />
        </button>
      )}

      <SessionTimeoutDialog open={showWarning} countdown={countdown} onExtend={extendSession} />
      <OnboardingDialog open={showOnboarding} onClose={() => setShowOnboarding(false)} />
    </div>
  );
}
