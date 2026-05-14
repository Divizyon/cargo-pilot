import { useState } from 'react';
import { AlertTriangle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { useSubscriptionStore, type SubscriptionPlan } from '@/lib/store/useSubscriptionStore';
import { useCancelSubscription, useReactivateSubscription } from '@/lib/api/useSubscription';

interface PlanDef {
  key: SubscriptionPlan;
  label: string;
  price: string;
  period: string;
  features: string[];
  highlighted?: boolean;
}

const PLANS: PlanDef[] = [
  {
    key: 'free',
    label: 'Ücretsiz',
    price: '₺0',
    period: '/ ay',
    features: ['3 yükleme planı / ay', '1 araç', '50 ürün', 'Temel raporlama'],
  },
  {
    key: 'starter',
    label: 'Starter',
    price: '₺499',
    period: '/ ay',
    features: [
      '30 yükleme planı / ay',
      '5 araç',
      '500 ürün',
      'Excel & PDF export',
      'E-posta desteği',
    ],
  },
  {
    key: 'pro',
    label: 'Pro',
    price: '₺1.299',
    period: '/ ay',
    highlighted: true,
    features: [
      'Sınırsız yükleme planı',
      'Sınırsız araç',
      'Sınırsız ürün',
      'ERP entegrasyonu',
      'Öncelikli destek',
      'Paylaşım linki',
    ],
  },
  {
    key: 'enterprise',
    label: 'Enterprise',
    price: 'Özel',
    period: '',
    features: [
      'Pro özelliklerin tamamı',
      'Özel SLA',
      'Dedicated destek',
      'SSO / SAML',
      'Özel entegrasyonlar',
    ],
  },
];

const PLAN_LABELS: Record<SubscriptionPlan, string> = {
  free: 'Ücretsiz',
  starter: 'Starter',
  pro: 'Pro',
  enterprise: 'Enterprise',
};

const DATE_FORMAT = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export function SubscriptionTab() {
  const { plan: currentPlan, expiresAt, willCancelAtPeriodEnd } = useSubscriptionStore();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { mutate: cancelSubscription, isPending: isCancelling } = useCancelSubscription();
  const { mutate: reactivateSubscription, isPending: isReactivating } = useReactivateSubscription();

  const formattedExpiry = expiresAt ? DATE_FORMAT.format(new Date(expiresAt)) : null;
  const canCancel = currentPlan !== 'free' && !willCancelAtPeriodEnd;

  return (
    <div className="flex flex-col gap-6">
      {/* Cancellation warning — AC2 */}
      {willCancelAtPeriodEnd && formattedExpiry && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <div className="flex-1 text-sm">
            <p className="font-medium text-foreground">
              Aboneliğiniz {formattedExpiry} tarihinde sona erecek.
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Bu tarihe kadar tüm özelliklerinize erişmeye devam edebilirsiniz.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="shrink-0 border-amber-500/40 text-xs hover:bg-amber-500/10"
            disabled={isReactivating}
            onClick={() => reactivateSubscription()}
          >
            İptali Geri Al
          </Button>
        </div>
      )}

      {/* Current plan banner */}
      <div className="flex items-center justify-between rounded-xl border bg-card p-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Mevcut Plan
          </p>
          <p className="mt-1 text-base font-bold text-foreground">{PLAN_LABELS[currentPlan]}</p>
          {expiresAt && !willCancelAtPeriodEnd && (
            <p className="mt-0.5 text-xs text-muted-foreground">Bitiş: {formattedExpiry}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {canCancel && (
            <Button
              size="sm"
              variant="ghost"
              className="text-xs text-muted-foreground hover:text-destructive"
              onClick={() => setConfirmOpen(true)}
            >
              Aboneliğimi İptal Et
            </Button>
          )}
          {currentPlan !== 'enterprise' && !willCancelAtPeriodEnd && (
            <Button size="sm" variant="outline">
              Planı Yükselt
            </Button>
          )}
        </div>
      </div>

      {/* Cancel confirmation dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aboneliği iptal et?</AlertDialogTitle>
            <AlertDialogDescription>
              {formattedExpiry
                ? `Aboneliğiniz ${formattedExpiry} tarihine kadar aktif kalacak. Bu tarihe kadar tüm özelliklerinizi kullanmaya devam edebilirsiniz.`
                : 'Mevcut dönem sonunda aboneliğiniz sona erecek. Bu süre zarfında tüm özelliklerinizi kullanmaya devam edebilirsiniz.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isCancelling}
              onClick={() => cancelSubscription()}
            >
              Evet, İptal Et
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Plan cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {PLANS.map((plan) => {
          const isActive = plan.key === currentPlan;
          return (
            <div
              key={plan.key}
              className={cn(
                'relative flex flex-col rounded-xl border p-4',
                plan.highlighted ? 'border-primary bg-primary/5' : 'bg-card',
                isActive && 'ring-2 ring-primary',
              )}
            >
              {plan.highlighted && (
                <span className="absolute -top-2.5 left-4 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                  Önerilen
                </span>
              )}
              {isActive && (
                <span className="absolute -top-2.5 right-4 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white">
                  Aktif
                </span>
              )}

              <div className="mb-4">
                <p className="text-sm font-semibold text-foreground">{plan.label}</p>
                <div className="mt-1 flex items-baseline gap-0.5">
                  <span className="text-2xl font-bold text-foreground">{plan.price}</span>
                  {plan.period && (
                    <span className="text-xs text-muted-foreground">{plan.period}</span>
                  )}
                </div>
              </div>

              <ul className="flex flex-1 flex-col gap-1.5 text-xs text-muted-foreground">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-1.5">
                    <Check className="mt-px h-3 w-3 shrink-0 text-emerald-500" />
                    {f}
                  </li>
                ))}
              </ul>

              <Button
                size="sm"
                variant={isActive ? 'outline' : plan.highlighted ? 'default' : 'outline'}
                className="mt-4 w-full text-xs"
                disabled={isActive}
              >
                {isActive ? 'Mevcut Plan' : plan.key === 'enterprise' ? 'İletişime Geç' : 'Seç'}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
