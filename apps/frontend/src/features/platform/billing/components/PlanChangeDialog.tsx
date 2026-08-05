import { useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, ArrowUp, ArrowDown, AlertCircle } from 'lucide-react';
import { type AxiosError } from 'axios';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { PLAN_ORDER, PLAN_LIMITS, type PlanLimits } from '@/lib/config/plan-features';
import { useChangeSubscription } from '@/lib/api/useSubscription';
import {
  useSubscriptionStore,
  type SubscriptionPlan,
  type SubscriptionUsage,
} from '@/lib/store/useSubscriptionStore';

interface PlanSummary {
  key: SubscriptionPlan;
  label: string;
  price: string;
  period: string;
}

interface PlanChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetPlan: PlanSummary;
}

function isUpgrade(current: SubscriptionPlan, target: SubscriptionPlan): boolean {
  return PLAN_ORDER.indexOf(target) > PLAN_ORDER.indexOf(current);
}

function buildUsageConflicts(usage: SubscriptionUsage, limits: PlanLimits): string[] {
  const conflicts: string[] = [];
  if (limits.maxVehicles !== null && usage.vehiclesCount > limits.maxVehicles) {
    conflicts.push(
      `${usage.vehiclesCount} araç tanımlı, yeni plan maksimum ${limits.maxVehicles} araç destekliyor.`,
    );
  }
  if (limits.maxProducts !== null && usage.productsCount > limits.maxProducts) {
    conflicts.push(
      `${usage.productsCount} ürün tanımlı, yeni plan maksimum ${limits.maxProducts} ürün destekliyor.`,
    );
  }
  if (limits.maxPlansPerMonth !== null && usage.plansUsed > limits.maxPlansPerMonth) {
    conflicts.push(
      `Bu ay ${usage.plansUsed} plan oluşturdunuz, yeni plan aylık ${limits.maxPlansPerMonth} plan destekliyor.`,
    );
  }
  return conflicts;
}

interface BackendErrorBody {
  isSuccess: boolean;
  error?: { description?: string };
}

export function PlanChangeDialog({ open, onOpenChange, targetPlan }: PlanChangeDialogProps) {
  const { plan: currentPlan, usage } = useSubscriptionStore();
  const { mutateAsync: changePlan, isPending } = useChangeSubscription();
  const [apiError, setApiError] = useState<string | null>(null);
  const [conflictsConfirmed, setConflictsConfirmed] = useState(false);

  const upgrading = isUpgrade(currentPlan, targetPlan.key);
  const targetLimits = PLAN_LIMITS[targetPlan.key];
  const conflicts = usage && !upgrading ? buildUsageConflicts(usage, targetLimits) : [];
  const hasConflicts = conflicts.length > 0;
  const requiresConfirm = hasConflicts && !conflictsConfirmed;

  async function handleConfirm() {
    if (requiresConfirm) {
      setConflictsConfirmed(true);
      return;
    }
    setApiError(null);
    try {
      const result = await changePlan({ plan: targetPlan.key });
      if (result.pendingDowngradeDate) {
        const date = new Intl.DateTimeFormat('tr-TR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }).format(new Date(result.pendingDowngradeDate));
        toast.info(`Planınız ${date} itibarıyla değişecektir.`, { position: 'bottom-right' });
      } else {
        toast.success(`${targetPlan.label} planına geçildi.`, { position: 'bottom-right' });
      }
      onOpenChange(false);
    } catch (err: unknown) {
      const axiosErr = err as AxiosError<BackendErrorBody>;
      const message =
        axiosErr.response?.data?.error?.description ?? 'Plan değişikliği başarısız oldu.';
      setApiError(message);
    }
  }

  function handleOpenChange(v: boolean) {
    if (!v) {
      setApiError(null);
      setConflictsConfirmed(false);
    }
    onOpenChange(v);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {upgrading ? (
              <ArrowUp className="h-5 w-5 text-emerald-500" />
            ) : (
              <ArrowDown className="h-5 w-5 text-amber-500" />
            )}
            Plan {upgrading ? 'Yükseltme' : 'Düşürme'}
          </DialogTitle>
          <DialogDescription>
            {upgrading
              ? `${targetPlan.label} planına geçmek üzeresiniz.`
              : `${targetPlan.label} planına geçmek üzeresiniz.`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 text-sm">
          <div className="rounded-lg border bg-muted/40 p-3">
            <div className="flex items-baseline justify-between">
              <span className="font-semibold">{targetPlan.label}</span>
              <span className="font-bold">
                {targetPlan.price}
                <span className="ml-0.5 text-xs font-normal text-muted-foreground">
                  {targetPlan.period}
                </span>
              </span>
            </div>
          </div>

          <Separator />

          {upgrading ? (
            <p className="text-muted-foreground">
              Yükseltme <strong className="text-foreground">anında aktif</strong> olur. Mevcut dönem
              için fark tutarı orantılı (prorated) olarak tahsil edilir.
            </p>
          ) : (
            <p className="text-muted-foreground">
              Düşürme <strong className="text-foreground">mevcut dönem sonunda</strong> geçerli
              olur. Dönem boyunca mevcut plan limitleriniz korunur.
            </p>
          )}

          {hasConflicts && !conflictsConfirmed && (
            <Alert className="border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-300">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <p className="mb-1 font-semibold">Mevcut kullanımınız yeni plan limitini aşıyor:</p>
                <ul className="list-disc pl-4 text-xs">
                  {conflicts.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {hasConflicts && conflictsConfirmed && (
            <Alert className="border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-300">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>Uyarıları onayladınız. Devam ediliyor.</AlertDescription>
            </Alert>
          )}

          {apiError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{apiError}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isPending}>
            İptal
          </Button>
          <Button onClick={handleConfirm} disabled={isPending}>
            {isPending
              ? 'İşleniyor...'
              : requiresConfirm
                ? 'Uyarıları Onaylıyorum, Devam Et'
                : upgrading
                  ? 'Yükselt'
                  : 'Düşür'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
