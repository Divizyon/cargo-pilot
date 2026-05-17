import { useState } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useSubscriptionStore, type SubscriptionPlan } from '@/lib/store/useSubscriptionStore';
import { PLAN_ORDER } from '@/lib/config/plan-features';
import { PaymentCheckoutInline } from './PaymentCheckoutDialog';
import { PlanChangeDialog } from './PlanChangeDialog';
import { CancellationDialog } from './CancellationDialog';
import { UsageStatsSection } from './UsageStatsSection';
import { CancelledBanner, ExpiredBanner, PendingDowngradeBanner } from './SubscriptionStatusBanner';

interface PlanDef {
  key: SubscriptionPlan;
  label: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  highlighted?: boolean;
}

const PLANS: PlanDef[] = [
  {
    key: 'free',
    label: 'Ücretsiz',
    price: '₺0',
    period: '/ ay',
    description: 'Başlamak için ihtiyacınız olan her şey.',
    features: ['3 yükleme planı / ay', '1 araç', '50 ürün', 'Temel raporlama'],
  },
  {
    key: 'starter',
    label: 'Starter',
    price: '₺499',
    period: '/ ay',
    description: 'Büyüyen ekipler için güçlü araçlar.',
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
    description: 'Profesyonel operasyonlar için sınırsız güç.',
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
    description: 'Kurumsal ihtiyaçlara özel çözüm.',
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

function isExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

type ViewState =
  | { type: 'default' }
  | { type: 'checkout'; plan: SubscriptionPlan }
  | { type: 'change'; plan: PlanDef }
  | { type: 'cancel' };

export function SubscriptionTab() {
  const {
    plan: currentPlan,
    expiresAt,
    cancelAtPeriodEnd,
    pendingDowngradePlan,
    pendingDowngradeDate,
    usage,
  } = useSubscriptionStore();

  const [view, setView] = useState<ViewState>({ type: 'default' });

  const expired = isExpired(expiresAt);
  const isPaid = currentPlan !== 'free';

  function handlePlanAction(plan: PlanDef) {
    if (plan.key === 'enterprise' || plan.key === currentPlan) return;
    if (currentPlan === 'free' || expired) {
      setView({ type: 'checkout', plan: plan.key });
    } else {
      setView({ type: 'change', plan });
    }
  }

  function getPlanActionLabel(plan: PlanDef): string {
    if (plan.key === currentPlan) return 'Mevcut Plan';
    if (plan.key === 'enterprise') return 'İletişime Geç';
    return PLAN_ORDER.indexOf(plan.key) > PLAN_ORDER.indexOf(currentPlan) ? 'Yükselt' : 'Düşür';
  }

  if (view.type === 'checkout') {
    return (
      <PaymentCheckoutInline
        initialPlan={view.plan}
        onCancel={() => setView({ type: 'default' })}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Status banners */}
      {expired && <ExpiredBanner onRenew={() => setView({ type: 'checkout', plan: 'pro' })} />}
      {!expired && cancelAtPeriodEnd && expiresAt && <CancelledBanner expiresAt={expiresAt} />}
      {!expired && pendingDowngradePlan && pendingDowngradeDate && (
        <PendingDowngradeBanner
          targetPlan={PLAN_LABELS[pendingDowngradePlan]}
          effectiveDate={pendingDowngradeDate}
        />
      )}

      {/* Current plan summary */}
      <div className="flex items-center justify-between rounded-xl border bg-muted p-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Mevcut Plan
          </p>
          <p className="mt-1 text-base font-bold text-foreground">{PLAN_LABELS[currentPlan]}</p>
          {expiresAt && !expired && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {cancelAtPeriodEnd ? 'Bitiş:' : 'Yenileme:'}{' '}
              {new Intl.DateTimeFormat('tr-TR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              }).format(new Date(expiresAt))}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isPaid && !cancelAtPeriodEnd && !expired && (
            <Button
              size="sm"
              variant="ghost"
              className="text-xs text-muted-foreground hover:text-destructive"
              onClick={() => setView({ type: 'cancel' })}
            >
              İptal Et
            </Button>
          )}
        </div>
      </div>

      {/* Usage stats */}
      {usage && (
        <div className="rounded-xl border bg-card p-4">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Kullanım
          </p>
          <UsageStatsSection usage={usage} />
        </div>
      )}

      <Separator />

      {/* Pricing — flat columns, no card borders */}
      <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2 xl:grid-cols-4">
        {PLANS.map((plan) => {
          const isActive = plan.key === currentPlan;
          const isPendingTarget = plan.key === pendingDowngradePlan && !isActive;

          return (
            <div key={plan.key} className="flex flex-col">
              {/* Badge row */}
              <div className="mb-2 h-5">
                {plan.highlighted && !isActive && (
                  <span className="rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-primary-foreground">
                    En Popüler
                  </span>
                )}
                {isActive && (
                  <span className="rounded-full bg-emerald-500 px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-white">
                    Aktif Plan
                  </span>
                )}
                {isPendingTarget && (
                  <span className="rounded-full bg-sky-500 px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-white">
                    Beklemede
                  </span>
                )}
              </div>

              {/* Plan name */}
              <p
                className={cn(
                  'mb-0.5 text-xs font-semibold uppercase tracking-widest',
                  plan.highlighted ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                {plan.label}
              </p>

              {/* Price */}
              <div className="mb-1 flex items-end gap-1">
                <span className="text-3xl font-extrabold tracking-tight text-foreground">
                  {plan.price}
                </span>
                {plan.period && (
                  <span className="mb-0.5 text-sm text-muted-foreground">{plan.period}</span>
                )}
              </div>
              <p
                className={cn(
                  'mb-1 text-[11px] text-muted-foreground',
                  !plan.period && 'invisible',
                )}
              >
                KDV dahil
              </p>

              {/* Divider */}
              <Separator className="mb-3" />

              {/* Features */}
              <ul className="flex flex-1 flex-col gap-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check
                      className={cn(
                        'mt-px h-3.5 w-3.5 shrink-0',
                        plan.highlighted ? 'text-primary' : 'text-emerald-500',
                      )}
                    />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              {/* CTA — bottom */}
              <Button
                size="sm"
                variant={isActive ? 'outline' : plan.highlighted ? 'default' : 'outline'}
                className="mt-4 w-full"
                disabled={isActive || plan.key === 'enterprise'}
                onClick={() => handlePlanAction(plan)}
              >
                {getPlanActionLabel(plan)}
              </Button>
            </div>
          );
        })}
      </div>

      {/* Dialogs */}
      {view.type === 'change' && (
        <PlanChangeDialog
          open
          onOpenChange={(v) => !v && setView({ type: 'default' })}
          targetPlan={view.plan}
        />
      )}
      {view.type === 'cancel' && (
        <CancellationDialog
          open
          onOpenChange={(v) => !v && setView({ type: 'default' })}
          expiresAt={expiresAt}
        />
      )}
    </div>
  );
}
