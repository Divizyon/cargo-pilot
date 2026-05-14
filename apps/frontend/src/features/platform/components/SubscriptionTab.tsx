import { useState } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSubscriptionStore, type SubscriptionPlan } from '@/lib/store/useSubscriptionStore';
import { PaymentCheckout } from './PaymentCheckout';
import type { Purchaseableplan } from '@/lib/api/useSubscription';

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
  const { plan: currentPlan, expiresAt } = useSubscriptionStore();
  const [checkoutPlan, setCheckoutPlan] = useState<PlanDef | null>(null);

  if (checkoutPlan) {
    return (
      <PaymentCheckout
        plan={
          checkoutPlan as { key: Purchaseableplan; label: string; price: string; period: string }
        }
        onBack={() => setCheckoutPlan(null)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Current plan banner */}
      <div className="flex items-center justify-between pb-4 border-b border-border">
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
        </div>
        {currentPlan !== 'enterprise' && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const pro = PLANS.find((p) => p.key === 'pro') ?? null;
              setCheckoutPlan(pro);
            }}
          >
            Planı Yükselt
          </Button>
        )}
      </div>

      {/* Plan listesi */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {PLANS.map((plan) => {
          const isActive = plan.key === currentPlan;
          const isPurchaseable = plan.key === 'starter' || plan.key === 'pro';
          return (
            <div
              key={plan.key}
              className={cn(
                'relative flex flex-col p-4',
                plan.highlighted ? 'border-l-2 border-primary pl-4' : 'border-l-2 border-transparent pl-4',
                isActive && 'border-l-2 border-emerald-500',
              )}
            >
              {plan.highlighted && !isActive && (
                <span className="mb-2 w-fit rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                  Önerilen
                </span>
              )}
              {isActive && (
                <span className="mb-2 w-fit rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
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
                onClick={() => {
                  if (isPurchaseable) setCheckoutPlan(plan);
                }}
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
