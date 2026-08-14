import { CheckCircle2, Info, Loader2, PlugZap, ShieldAlert, Trash2, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  ErpSetupHelpContent,
  ErpSetupHelpPopover,
} from '@/features/platform/erp/components/ErpSetupHelp';
import type { ErpSettings } from '@/lib/types/erp';
import { PROVIDER_TYPE_FROM_INT } from '@/lib/api/useERPIntegration';

/**
 * Kartın rengi durumu tek başına anlatmaz: her tonun yanında bir ikon ve bir metin
 * etiketi durur. Renk körlüğünde ya da yüksek kontrast modunda yeşil ile gri
 * birbirinden ayırt edilemezdi.
 */
type StatusTone = 'neutral' | 'connected' | 'failed';

const TONE_CLASS: Record<StatusTone, string> = {
  neutral: 'border-border bg-muted/40',
  connected: 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30',
  failed: 'border-destructive/40 bg-destructive/10',
};

const BADGE_CLASS: Record<StatusTone, string> = {
  neutral: 'bg-muted text-muted-foreground',
  connected: 'bg-green-100 text-green-800 dark:bg-green-900/60 dark:text-green-300',
  failed: 'bg-destructive/15 text-destructive',
};

const ICON_CLASS: Record<StatusTone, string> = {
  neutral: 'text-muted-foreground',
  connected: 'text-green-600 dark:text-green-400',
  failed: 'text-destructive',
};

interface ConnectionStatus {
  tone: StatusTone;
  label: string;
  detail: string;
  icon: typeof CheckCircle2;
}

function formatTestDate(iso: string | null): string {
  if (!iso) return '—';
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? '—' : format(parsed, 'dd.MM.yyyy HH:mm', { locale: tr });
}

/** 'Bağlı' yalnızca güncel başarılı testle verilir; kayıtlı olmak bağlı olmak değildir. */
function buildConnectionStatus(
  lastTestSucceeded: boolean | null,
  lastTestedAt: string | null,
): ConnectionStatus {
  if (lastTestSucceeded === true) {
    return {
      tone: 'connected',
      label: 'Bağlı',
      detail: `Son başarılı test: ${formatTestDate(lastTestedAt)}`,
      icon: CheckCircle2,
    };
  }
  if (lastTestSucceeded === false) {
    return {
      tone: 'failed',
      label: 'Test başarısız',
      detail: `Son deneme: ${formatTestDate(lastTestedAt)} — bu ayarlarla ERP'ye bağlanılamıyor.`,
      icon: XCircle,
    };
  }
  return {
    tone: 'neutral',
    label: 'Kayıtlı (test edilmedi)',
    detail: 'Bu ayarlarla henüz başarılı bir bağlantı testi yapılmadı.',
    icon: ShieldAlert,
  };
}

interface ErpConnectionStatusCardProps {
  /** null iken kurulum yardımı gösterilir; kart aynı kabuğu korur. */
  settings: ErpSettings | null;
  systemName?: string | null;
  isTesting: boolean;
  isDeleting: boolean;
  onTest: () => void;
  onRemove: () => void;
  onCopyChecklist: () => void;
}

/**
 * Bağlantı durumunun tek kartı. Önce iki ayrı yüzey vardı — bağlantı yokken bilgi kartı,
 * varken çıplak bir satır — ve ikisi birbirine benzemediği için ekran durum değiştirdiğinde
 * yeniden yerleşiyordu. Kabuk sabit kalır, yalnızca ton ve içerik değişir.
 */
export function ErpConnectionStatusCard({
  settings,
  systemName,
  isTesting,
  isDeleting,
  onTest,
  onRemove,
  onCopyChecklist,
}: ErpConnectionStatusCardProps) {
  if (!settings) {
    return (
      <div className={cn('space-y-3 rounded-lg border px-4 py-3', TONE_CLASS.neutral)}>
        <div className="flex gap-2.5">
          <Info className={cn('mt-0.5 h-4 w-4 shrink-0', ICON_CLASS.neutral)} aria-hidden="true" />
          <ErpSetupHelpContent onCopyChecklist={onCopyChecklist} />
        </div>
      </div>
    );
  }

  const status = buildConnectionStatus(
    settings.lastTestSucceeded ?? null,
    settings.lastTestedAt ?? null,
  );

  return (
    <div className={cn('rounded-lg border px-4 py-3', TONE_CLASS[status.tone])}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <status.icon
            className={cn('h-4 w-4 shrink-0', ICON_CLASS[status.tone])}
            aria-hidden="true"
          />
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2">
            <span className="text-sm font-medium text-foreground">
              {systemName ?? PROVIDER_TYPE_FROM_INT[settings.providerType]}
            </span>
            <span className="truncate text-xs text-muted-foreground">{settings.serverAddress}</span>
            {/* Son test bilgisi metin olarak kalır; title içine gömülseydi ekran
                okuyucuya ve dokunmatik cihaza ulaşmazdı. */}
            <span className="text-xs text-muted-foreground">{status.detail}</span>
          </div>
          <span
            className={cn(
              'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium',
              BADGE_CLASS[status.tone],
            )}
          >
            {status.label}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 px-2 text-xs"
            disabled={isTesting}
            onClick={onTest}
          >
            {isTesting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <PlugZap className="h-3.5 w-3.5" />
            )}
            Test Et
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
            disabled={isDeleting}
            onClick={onRemove}
          >
            {isDeleting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            Kaldır
          </Button>
          <ErpSetupHelpPopover onCopyChecklist={onCopyChecklist} />
        </div>
      </div>
    </div>
  );
}
