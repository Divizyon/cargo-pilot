import { Outlet } from 'react-router-dom';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { Button } from '@/components/ui/button';

function Sidebar() {
  return (
    <aside className="flex h-full w-60 flex-col border-r border-border bg-card px-4 py-6">
      <span className="mb-8 text-lg font-bold tracking-tight">Cargo Pilot</span>
      <nav className="flex flex-col gap-1 text-sm text-muted-foreground">
        <a href="/dashboard" className="rounded-md px-3 py-2 hover:bg-accent hover:text-accent-foreground">
          Dashboard
        </a>
      </nav>
    </aside>
  );
}

function Topbar() {
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card px-6">
      <span className="text-sm text-muted-foreground">{user?.fullName}</span>
      <Button variant="ghost" size="sm" onClick={clearAuth}>
        Çıkış
      </Button>
    </header>
  );
}

export function DashboardLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
