import { useEffect, useState, type ElementType, type ReactNode } from 'react';
import { FlaskConical, LogOut, Moon, Repeat, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CargoPilotLogo } from '@/components/shared/CargoPilotLogo';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { cn } from '@/lib/utils';

/**
 * Uygulama kabuğu — üretimdeki `DashboardLayout` ile aynı iskelet.
 *
 * Eskiden gezinme üç seviyeliydi: üstte mod sekmesi, içinde üç kolon, sağ kolonda
 * tekrar sekme. Kullanıcı nerede olduğunu kaybediyordu. Üretimde gezinme tek
 * seviyelidir — sol sidebar — ve test aracı da aynı ürünün parçası gibi durmalı.
 */

export type ViewId = 'single' | 'suite';

interface NavItem {
  id: ViewId;
  label: string;
  icon: ElementType;
}

/**
 * Sıra araca ne için gelindiğini söylüyor: toplu koşu asıl iş, tek senaryo onun
 * teşhis adımı. Ters sırada, elle tek yük kurmak öne çıkıyordu — üretim
 * uygulamasının zaten yaptığı ve aracın yerine geçmeye çalıştığı yavaş yol.
 */
const NAV: NavItem[] = [
  { id: 'suite', label: 'Toplu Koşu', icon: Repeat },
  { id: 'single', label: 'Senaryo İnceleme', icon: FlaskConical },
];

const THEME_KEY = 'cargo-pilot-algorithm-test-theme';

/** Kayıtlı seçim yoksa koyu. Tek yerde karar verilir; kabuk da açılış da bunu okur. */
function prefersDark(): boolean {
  try {
    return localStorage.getItem(THEME_KEY) !== 'light';
  } catch {
    return true;
  }
}

/**
 * Temayı React devreye girmeden uygular. `useEffect` ilk boyamadan sonra
 * çalıştığı için açılışta bir kare açık tema görünüyordu.
 */
export function applyStoredTheme(): void {
  document.documentElement.classList.toggle('dark', prefersDark());
}

/**
 * Varsayılan koyu: araç uzun süre açık kalan bir kontrol ekranı ve çizim
 * yüzeyi koyu zeminde okunuyor. Kullanıcının seçimi kaydedilirse o kazanır.
 */
function useTheme() {
  const [isDark, setIsDark] = useState(prefersDark);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    try {
      localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
    } catch {
      // Depolama kapalı; tema oturum boyunca yaşar.
    }
  }, [isDark]);

  return { isDark, toggle: () => setIsDark((v) => !v) };
}

interface AppShellProps {
  view: ViewId;
  onViewChange: (view: ViewId) => void;
  /** Sekme başlığında gösterilen canlı durum, ör. koşu sürüyor. */
  badge?: Partial<Record<ViewId, ReactNode>>;
  children: ReactNode;
}

export function AppShell({ view, onViewChange, badge, children }: AppShellProps) {
  const logout = useAuthStore((s) => s.logout);
  const { isDark, toggle } = useTheme();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <div className="flex items-center gap-3 border-b border-sidebar-border px-4 py-4">
          <CargoPilotLogo className="h-11 w-11 shrink-0 text-foreground" />
          <div className="min-w-0">
            <span className="block text-[15px] font-bold tracking-[0.15em] text-foreground">
              CARGOPILOT
            </span>
            <span className="block text-[10px] uppercase tracking-widest text-muted-foreground">
              Algoritma Testi
            </span>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
          {NAV.map((item) => (
            <NavButton
              key={item.id}
              item={item}
              isActive={view === item.id}
              badge={badge?.[item.id]}
              onClick={() => onViewChange(item.id)}
            />
          ))}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <div className="flex h-9 items-center justify-between px-3">
            <span className="text-sm font-medium text-muted-foreground">Tema</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={toggle}
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              aria-label={isDark ? 'Açık temaya geç' : 'Koyu temaya geç'}
            >
              {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </Button>
          </div>
          <button
            type="button"
            onClick={logout}
            className="flex h-9 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Çıkış Yap
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Dar ekranda sidebar yerine yatay şerit; araç masaüstü içindir, çekmece
            kurmak taşıdığı değerden fazla karmaşıklık getirirdi. */}
        <header className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-border bg-sidebar px-3 py-2 lg:hidden">
          <CargoPilotLogo className="mr-2 h-7 w-7 shrink-0 text-foreground" />
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onViewChange(item.id)}
              className={cn(
                'shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                view === item.id
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {item.label}
            </button>
          ))}
        </header>

        <main className="flex-1 overflow-auto bg-page-background p-3 sm:p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}

function NavButton({
  item,
  isActive,
  badge,
  onClick,
}: {
  item: NavItem;
  isActive: boolean;
  badge?: ReactNode;
  onClick: () => void;
}) {
  return (
    <div className="relative">
      {/* Sol ray göstergesi — üretimdeki NavItem ile aynı. */}
      {isActive && <div className="absolute left-0 top-1.5 h-6 w-0.5 rounded-r-full bg-primary" />}
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'flex h-9 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors',
          isActive
            ? 'bg-accent text-accent-foreground'
            : 'text-muted-foreground hover:bg-sidebar-accent hover:text-foreground',
        )}
      >
        <item.icon className="h-4 w-4 shrink-0" strokeWidth={isActive ? 2.5 : 2} />
        <span className="flex-1 text-left">{item.label}</span>
        {badge}
      </button>
    </div>
  );
}

interface PageHeaderProps {
  title: string;
  description: string;
  action?: ReactNode;
}

/** Sayfa başlığı deseni — üretimdeki liste sayfalarıyla birebir aynı. */
export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl font-bold tracking-tight text-foreground">{title}</h1>
        <p className="mt-0.5 max-w-2xl text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}

interface SectionCardProps {
  title: string;
  meta?: ReactNode;
  children: ReactNode;
}

/** Başlıklı kart. Sekmeye gerek kalmadan iki paneli yan yana ayırmak için. */
export function SectionCard({ title, meta, children }: SectionCardProps) {
  return (
    <section className="flex min-w-0 flex-col rounded-lg border border-border bg-card">
      <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {meta}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}
