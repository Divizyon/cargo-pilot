import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PLAN_ORDER } from '@/lib/config/plan-features';
import { useChangePlan } from '@/lib/api/usePlanChange';
import { useUsageQuota } from '@/lib/api/useUsageQuota';
import { useSubscriptionStore, type SubscriptionPlan } from '@/lib/store/useSubscriptionStore';
import axios from 'axios';

const PLAN_LABELS: Record<SubscriptionPlan, string> = {
  free: 'Ücretsiz',
  starter: 'Starter',
  pro: 'Pro',
  enterprise: 'Enterprise',
};

const PLAN_LIMITS: Record<
  SubscriptionPlan,
  { plans: number | null; vehicles: number | null; products: number | null }
> = {
  free: { plans: 3, vehicles: 1, products: 50 },
  starter: { plans: 30, vehicles: 5, products: 500 },
  pro: { plans: null, vehicles: null, products: null },
  enterprise: { plans: null, vehicles: null, products: null },
};

interface PlanChangeDialogProps {
  open: boolean;
  targetPlan: SubscriptionPlan;
  onClose: () => void;
}

export function PlanChangeDialog({ open, targetPlan, onClose }: PlanChangeDialogProps) {
  const { plan: currentPlan, expiresAt, setPlan, setPendingDowngrade } = useSubscriptionStore();
  const { mutate: changePlan, isPending, error } = useChangePlan();
  const { data: quota } = useUsageQuota();
  const [confirmed, setConfirmed] = useState(false);

  const currentIdx = PLAN_ORDER.indexOf(currentPlan);
  const targetIdx = PLAN_ORDER.indexOf(targetPlan);
  const isUpgrade = targetIdx > currentIdx;
  const direction = isUpgrade ? 'upgrade' : 'downgrade';

  const targetLimits = PLAN_LIMITS[targetPlan];
  const usageViolations: string[] = [];

  if (!isUpgrade && quota) {
    if (targetLimits.vehicles !== null && quota.vehicles.used > targetLimits.vehicles) {
      usageViolations.push(
        `${quota.vehicles.used} araç tanımlı, yeni plan maksimum ${targetLimits.vehicles} araç destekliyor.`,
      );
    }
    if (targetLimits.products !== null && quota.products.used > targetLimits.products) {
      usageViolations.push(
        `${quota.products.used} ürün tanımlı, yeni plan maksimum ${targetLimits.products} ürün destekliyor.`,
      );
    }
    if (targetLimits.plans !== null && quota.plans.used > targetLimits.plans) {
      usageViolations.push(
        `Bu ay ${quota.plans.used} yükleme planı oluşturuldu, yeni plan aylık maksimum ${targetLimits.plans} destekliyor.`,
      );
    }
  }

  const hasViolations = usageViolations.length > 0;
  const needsExplicitConfirm = !isUpgrade && hasViolations;
  const canSubmit = !needsExplicitConfirm || confirmed;

  const effectiveDate = expiresAt
    ? new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }).format(
        new Date(expiresAt),
      )
    : 'dönem sonunda';

  const serverError = error
    ? axios.isAxiosError(error) && error.response?.data?.message
      ? (error.response.data.message as string)
      : 'İşlem gerçekleştirilemedi. Lütfen tekrar deneyin.'
    : null;

  function handleClose() {
    setConfirmed(false);
    onClose();
  }

  function handleSubmit() {
    changePlan(
      { planKey: targetPlan, direction },
      {
        onSuccess(data) {
          if (data.type === 'upgrade') {
            setPlan(data.plan, data.expiresAt);
            toast.success(`${PLAN_LABELS[data.plan]} planına geçiş tamamlandı.`, {
              position: 'bottom-right',
            });
          } else {
            setPendingDowngrade(data.pendingPlan, data.pendingAt);
            toast.success(
              `Planınız ${new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(data.pendingAt))} itibarıyla değişecektir.`,
              { position: 'bottom-right' },
            );
          }
          handleClose();
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isUpgrade ? 'Planı Yükselt' : 'Planı Düşür'}: {PLAN_LABELS[targetPlan]}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <p className="text-sm text-muted-foreground">
            {PLAN_LABELS[currentPlan]} → {PLAN_LABELS[targetPlan]}
          </p>

          {isUpgrade ? (
            <p className="text-sm text-foreground">
              Yükseltme anında aktifleşir. Mevcut dönem için orantılı (prorated) tutar Stripe
              üzerinden tahsil edilir.
            </p>
          ) : (
            <p className="text-sm text-foreground">
              Plan düşürme <span className="font-semibold">{effectiveDate}</span> itibarıyla geçerli
              olacaktır. Bu tarihe kadar mevcut plan limitleriniz korunur.
            </p>
          )}

          {hasViolations && (
            <div className="flex flex-col gap-2 rounded-lg bg-destructive/5 p-3">
              <div className="flex items-center gap-1.5 text-sm font-semibold text-destructive">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Kullanım uyarısı
              </div>
              <ul className="flex flex-col gap-1">
                {usageViolations.map((v) => (
                  <li key={v} className="text-xs text-destructive">
                    {v}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {needsExplicitConfirm && (
            <label className="flex cursor-pointer items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-0.5 shrink-0 accent-primary"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
              <span className="text-muted-foreground">
                Mevcut kullanımımın yeni plan limitlerinin üzerinde olduğunu anlıyor ve devam etmek
                istiyorum.
              </span>
            </label>
          )}

          {serverError && <p className="text-sm text-destructive">{serverError}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            İptal
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending || !canSubmit}
            variant={isUpgrade ? 'default' : 'destructive'}
          >
            {isPending ? 'İşleniyor…' : isUpgrade ? 'Yükselt' : 'Düşür'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
