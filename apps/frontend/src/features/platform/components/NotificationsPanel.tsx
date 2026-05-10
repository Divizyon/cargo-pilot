import {
  type ForwardRefExoticComponent,
  type MouseEvent,
  type RefAttributes,
  useMemo,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  AlertOctagon,
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  Bell,
  CheckCheck,
  Clock,
  CreditCard,
  ExternalLink,
  FileBarChart2,
  FileX,
  RefreshCw,
  Search,
  Trash2,
  XCircle,
  Zap,
  type LucideProps,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  NotificationSeverity,
  NotificationType,
  useDeleteNotification,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  type Notification,
  type NotificationFilters,
} from '@/lib/api/useNotifications';

// ─── Type metadata ────────────────────────────────────────────────────────────

type IconComponent = ForwardRefExoticComponent<
  Omit<LucideProps, 'ref'> & RefAttributes<SVGSVGElement>
>;

const TYPE_ICON: Record<string, IconComponent> = {
  [NotificationType.ERP_SYNC_ERROR]: AlertCircle,
  [NotificationType.REPORT_READY]: FileBarChart2,
  [NotificationType.REPORT_ERROR]: FileX,
  [NotificationType.OPTIMIZATION_COMPLETE]: Zap,
  [NotificationType.OPTIMIZATION_FAILED]: XCircle,
  [NotificationType.TRIAL_EXPIRING]: Clock,
  [NotificationType.TRIAL_EXPIRED]: Clock,
  [NotificationType.PAYMENT_SUCCESS]: CreditCard,
  [NotificationType.PAYMENT_FAILED]: CreditCard,
  [NotificationType.SUBSCRIPTION_RENEWED]: RefreshCw,
  [NotificationType.SUBSCRIPTION_CANCELLED]: RefreshCw,
  [NotificationType.PLAN_UPGRADED]: ArrowUpCircle,
  [NotificationType.PLAN_DOWNGRADED]: ArrowDownCircle,
  [NotificationType.USAGE_LIMIT_WARNING]: AlertTriangle,
  [NotificationType.USAGE_LIMIT_REACHED]: AlertOctagon,
};

const SEVERITY_BADGE: Record<string, string> = {
  [NotificationSeverity.Error]: 'border border-red-200 bg-red-50 text-red-600',
  [NotificationSeverity.Warning]: 'border border-amber-200 bg-amber-50 text-amber-600',
  [NotificationSeverity.Success]: 'border border-emerald-200 bg-emerald-50 text-emerald-600',
  [NotificationSeverity.Info]: 'border border-sky-200 bg-sky-50 text-sky-600',
};

// ─── Filter tabs ──────────────────────────────────────────────────────────────

type FilterTab = 'all' | 'unread' | 'errors';

const FILTER_TABS: { value: FilterTab; label: string }[] = [
  { value: 'all', label: 'Tümü' },
  { value: 'unread', label: 'Okunmamış' },
  { value: 'errors', label: 'Hatalar' },
];

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function NotificationSkeleton() {
  return (
    <div className="space-y-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-3 rounded-xl p-4">
          <Skeleton className="mt-0.5 h-8 w-8 shrink-0 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-48" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Single notification item ─────────────────────────────────────────────────

interface NotificationItemProps {
  notification: Notification;
}

function NotificationItem({ notification: n }: NotificationItemProps) {
  const navigate = useNavigate();
  const { mutate: markRead } = useMarkNotificationRead();
  const { mutate: deleteNotification } = useDeleteNotification();

  const Icon = TYPE_ICON[n.type] ?? Bell;
  const badgeClass =
    SEVERITY_BADGE[n.severity] ?? 'border border-border bg-muted text-muted-foreground';

  function handleActionClick(e: MouseEvent) {
    e.stopPropagation();
    if (!n.actionUrl) return;
    if (!n.isRead) markRead(n.id);
    if (n.actionUrl.startsWith('/')) {
      void navigate(n.actionUrl);
    } else {
      window.open(n.actionUrl, '_blank', 'noopener,noreferrer');
    }
  }

  function handleRowClick() {
    if (!n.isRead) markRead(n.id);
  }

  function handleDelete(e: MouseEvent) {
    e.stopPropagation();
    deleteNotification(n.id);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleRowClick}
      onKeyDown={(e) => e.key === 'Enter' && handleRowClick()}
      className={cn(
        'group relative flex cursor-pointer gap-3 rounded-xl p-4 transition-colors hover:bg-accent/60',
        !n.isRead && 'bg-accent/30',
      )}
    >
      {/* Unread dot */}
      {!n.isRead && (
        <span className="absolute left-2 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-primary" />
      )}

      {/* Icon badge */}
      <div
        className={cn(
          'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
          badgeClass,
        )}
      >
        <Icon className="h-4 w-4" strokeWidth={1.75} />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <p
            className={cn(
              'flex-1 text-sm leading-snug',
              n.isRead ? 'font-normal text-foreground' : 'font-semibold text-foreground',
            )}
          >
            {n.title}
          </p>
          <span className="shrink-0 text-[10px] text-muted-foreground">
            {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: tr })}
          </span>
        </div>
        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.description}</p>
      </div>

      {/* Right-side actions */}
      <div className="mt-0.5 flex shrink-0 items-start gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        {n.actionUrl && (
          <button
            type="button"
            aria-label="Sayfaya git"
            onClick={handleActionClick}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-primary"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          type="button"
          aria-label="Bildirimi sil"
          onClick={handleDelete}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── NotificationsPanel ───────────────────────────────────────────────────────

export function NotificationsPanel() {
  const [tab, setTab] = useState<FilterTab>('all');
  const [search, setSearch] = useState('');

  const filters = useMemo<NotificationFilters>(() => {
    const f: NotificationFilters = {};
    if (tab === 'unread') f.isRead = false;
    if (tab === 'errors') f.severity = NotificationSeverity.Error;
    if (search.length >= 2) f.search = search;
    return f;
  }, [tab, search]);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useNotifications(filters);

  const { mutate: markAllRead, isPending: isMarkingAll } = useMarkAllNotificationsRead();

  const notifications = useMemo(() => data?.pages.flatMap((p) => p.items) ?? [], [data]);

  const totalUnread = data?.pages[0]?.totalUnread ?? 0;
  const isEmpty = !isLoading && notifications.length === 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Tabs */}
        <div className="flex shrink-0 items-center gap-1 rounded-lg border border-border bg-background p-1">
          {FILTER_TABS.map((t) => (
            <Button
              key={t.value}
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setTab(t.value);
              }}
              className={cn(
                'relative h-auto rounded-md px-3 py-1 text-xs font-medium',
                tab === t.value
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              {t.label}
              {t.value === 'unread' && totalUnread > 0 && (
                <Badge className="ml-1.5 h-4 min-w-4 px-1 text-[10px]">{totalUnread}</Badge>
              )}
            </Button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Bildirim ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 w-full pl-8 text-xs"
          />
        </div>

        {/* Mark all read */}
        <Button
          variant="outline"
          size="sm"
          className="ml-auto shrink-0 gap-1.5 text-xs"
          disabled={totalUnread === 0 || isMarkingAll}
          onClick={() => markAllRead()}
        >
          <CheckCheck className="h-3.5 w-3.5" />
          Tümünü okundu işaretle
        </Button>
      </div>

      {/* List card */}
      <div className="overflow-hidden rounded-2xl border border-border bg-background">
        {isLoading ? (
          <div className="p-2">
            <NotificationSkeleton />
          </div>
        ) : isEmpty ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Bell className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">
                {tab === 'unread'
                  ? 'Okunmamış bildirim yok'
                  : tab === 'errors'
                    ? 'Hata bildirimi yok'
                    : 'Henüz bildirim yok'}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {tab === 'all'
                  ? 'ERP, rapor ve plan bildirimleri burada görünecek.'
                  : 'Filtreyi değiştirerek diğer bildirimleri görebilirsiniz.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="p-2 space-y-0.5">
            {notifications.map((n) => (
              <NotificationItem key={n.id} notification={n} />
            ))}
          </div>
        )}
      </div>

      {/* Load more */}
      {hasNextPage && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            disabled={isFetchingNextPage}
            onClick={() => void fetchNextPage()}
          >
            {isFetchingNextPage ? 'Yükleniyor…' : 'Daha fazla yükle'}
          </Button>
        </div>
      )}

      {/* Severity legend */}
      {!isLoading && notifications.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 px-1">
          {(
            [
              { s: NotificationSeverity.Error, label: 'Hata', color: 'bg-destructive' },
              { s: NotificationSeverity.Warning, label: 'Uyarı', color: 'bg-amber-500' },
              { s: NotificationSeverity.Success, label: 'Başarı', color: 'bg-emerald-500' },
              { s: NotificationSeverity.Info, label: 'Bilgi', color: 'bg-blue-500' },
            ] as const
          ).map(({ s, label, color }) => (
            <button
              key={s}
              type="button"
              onClick={() => setTab('all')}
              className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground"
            >
              <span className={cn('h-2 w-2 rounded-full', color)} />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
