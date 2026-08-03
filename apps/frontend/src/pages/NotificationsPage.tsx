import { NotificationsPanel } from '@/features/platform/components/NotificationsPanel';

export function NotificationsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">Bildirimler</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          ERP, rapor ve plan bildirimlerini buradan takip edin.
        </p>
      </div>

      <NotificationsPanel />
    </div>
  );
}
