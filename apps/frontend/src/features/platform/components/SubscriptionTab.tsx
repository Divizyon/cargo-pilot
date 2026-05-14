import { useState } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSubscriptionStore, type SubscriptionPlan } from '@/lib/store/useSubscriptionStore';
import { PLAN_ORDER } from '@/lib/config/plan-features';
import { PlanChangeDialog } from './PlanChangeDialog';

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

export function SubscriptionTab() {
  const { plan: currentPlan, expiresAt, pendingPlan, pendingAt } = useSubscriptionStore();
  const [changePlanKey, setChangePlanKey] = useState<SubscriptionPlan | null>(null);

  const currentIdx = PLAN_ORDER.indexOf(currentPlan);

  return (
    <>
      <div className="flex flex-col gap-6">
        {/* Mevcut plan banner */}
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Mevcut Plan
            </p>
            <p className="mt-1 text-base font-bold text-foreground">{PLAN_LABELS[currentPlan]}</p>
            {expiresAt && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                Bitiş:{' '}
                {new Intl.DateTimeFormat('tr-TR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                }).format(new Date(expiresAt))}
              </p>
            )}
            {pendingPlan && pendingAt && (
              <p className="mt-1 text-xs text-amber-600">
                Planınız{' '}
                {new Intl.DateTimeFormat('tr-TR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                }).format(new Date(pendingAt))}{' '}
                itibarıyla <span className="font-semibold">{PLAN_LABELS[pendingPlan]}</span>&apos;a
                değişecektir.
              </p>
            )}
          </div>
          {currentPlan !== 'enterprise' && currentIdx < PLAN_ORDER.indexOf('pro') && (
            <Button size="sm" variant="outline" onClick={() => setChangePlanKey('pro')}>
              Planı Yükselt
            </Button>
          )}
        </div>

        {/* Plan listesi */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((plan) => {
            const isActive = plan.key === currentPlan;
            const isPending = plan.key === pendingPlan;
            const isChangeable = (plan.key === 'starter' || plan.key === 'pro') && !isActive;

            return (
              <div
                key={plan.key}
                className={cn(
                  'relative flex flex-col p-4',
                  plan.highlighted
                    ? 'border-l-2 border-primary pl-4'
                    : 'border-l-2 border-transparent pl-4',
                  isActive && 'border-l-2 border-emerald-500',
                  isPending && !isActive && 'border-l-2 border-amber-400',
                )}
              >
                {plan.highlighted && !isActive && !isPending && (
                  <span className="mb-2 w-fit rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                    Önerilen
                  </span>
                )}
                {isActive && (
                  <span className="mb-2 w-fit rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                    Aktif
                  </span>
                )}
                {isPending && !isActive && (
                  <span className="mb-2 w-fit rounded-full bg-amber-400/10 px-2 py-0.5 text-[10px] font-bold text-amber-600">
                    Bekliyor
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
                  disabled={isActive || isPending || !isChangeable}
                  onClick={() => {
                    if (isChangeable) setChangePlanKey(plan.key);
                  }}
                >
                  {isActive
                    ? 'Mevcut Plan'
                    : isPending
                      ? 'Bekliyor'
                      : plan.key === 'enterprise'
                        ? 'İletişime Geç'
                        : 'Seç'}
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      {changePlanKey && (
        <PlanChangeDialog open targetPlan={changePlanKey} onClose={() => setChangePlanKey(null)} />
      )}
    </>
  );
}
