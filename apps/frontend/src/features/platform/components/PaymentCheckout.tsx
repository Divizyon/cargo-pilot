import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { paymentSchema, type PaymentFormValues } from '../schemas/paymentSchema';
import { usePurchaseSubscription, type Purchaseableplan } from '@/lib/api/useSubscription';
import { useSubscriptionStore } from '@/lib/store/useSubscriptionStore';
import axios from 'axios';

interface PlanSummary {
  key: Purchaseableplan;
  label: string;
  price: string;
  period: string;
}

interface PaymentCheckoutProps {
  plan: PlanSummary;
  onBack: () => void;
}

function formatCardNumber(value: string): string {
  return value
    .replace(/\D/g, '')
    .slice(0, 16)
    .replace(/(\d{4})(?=\d)/g, '$1 ');
}

function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length > 2) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return digits;
}

export function PaymentCheckout({ plan, onBack }: PaymentCheckoutProps) {
  const navigate = useNavigate();
  const setPlan = useSubscriptionStore((s) => s.setPlan);
  const { mutate: purchase, isPending, error } = usePurchaseSubscription();

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { cardHolder: '', cardNumber: '', expiry: '', cvc: '' },
  });

  const serverError = error
    ? axios.isAxiosError(error) && error.response?.data?.message
      ? (error.response.data.message as string)
      : 'Ödeme işlemi başarısız oldu. Lütfen tekrar deneyin.'
    : null;

  function onSubmit(values: PaymentFormValues) {
    purchase(
      {
        planKey: plan.key,
        cardHolder: values.cardHolder,
        cardNumber: values.cardNumber.replace(/\s/g, ''),
        expiry: values.expiry,
        cvc: values.cvc,
      },
      {
        onSuccess(data) {
          setPlan(data.plan, data.expiresAt);
          navigate('/dashboard', { replace: true });
          toast.success('Aboneliğiniz başarıyla başlatıldı.', { position: 'bottom-right' });
        },
      },
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <button
        type="button"
        onClick={onBack}
        className="flex w-fit items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Plan seçimine dön
      </button>

      {/* Plan özeti */}
      <div className="rounded-xl border bg-card p-4">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Seçilen Plan
        </p>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-base font-bold text-foreground">{plan.label}</span>
          <div className="flex items-baseline gap-0.5">
            <span className="text-xl font-bold text-foreground">{plan.price}</span>
            {plan.period && <span className="text-xs text-muted-foreground">{plan.period}</span>}
          </div>
        </div>
      </div>

      {/* Ödeme formu */}
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <div className="rounded-xl border bg-card p-5">
          <p className="mb-4 text-sm font-semibold text-foreground">Kart Bilgileri</p>

          <div className="flex flex-col gap-3">
            {/* Kart sahibi */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cardHolder" className="text-xs">
                Kart Sahibi
              </Label>
              <Input
                id="cardHolder"
                placeholder="Ad Soyad"
                autoComplete="cc-name"
                className={cn('text-sm', form.formState.errors.cardHolder && 'border-destructive')}
                {...form.register('cardHolder')}
              />
              {form.formState.errors.cardHolder && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.cardHolder.message}
                </p>
              )}
            </div>

            {/* Kart numarası */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cardNumber" className="text-xs">
                Kart Numarası
              </Label>
              <Input
                id="cardNumber"
                placeholder="1234 5678 9012 3456"
                autoComplete="cc-number"
                inputMode="numeric"
                maxLength={19}
                className={cn('text-sm', form.formState.errors.cardNumber && 'border-destructive')}
                {...form.register('cardNumber', {
                  onChange(e) {
                    e.target.value = formatCardNumber(e.target.value);
                  },
                })}
              />
              {form.formState.errors.cardNumber && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.cardNumber.message}
                </p>
              )}
            </div>

            {/* Son kullanma tarihi + CVC */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="expiry" className="text-xs">
                  Son Kullanma Tarihi
                </Label>
                <Input
                  id="expiry"
                  placeholder="AA/YY"
                  autoComplete="cc-exp"
                  inputMode="numeric"
                  maxLength={5}
                  className={cn('text-sm', form.formState.errors.expiry && 'border-destructive')}
                  {...form.register('expiry', {
                    onChange(e) {
                      e.target.value = formatExpiry(e.target.value);
                    },
                  })}
                />
                {form.formState.errors.expiry && (
                  <p className="text-xs text-destructive">{form.formState.errors.expiry.message}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cvc" className="text-xs">
                  CVC
                </Label>
                <Input
                  id="cvc"
                  placeholder="123"
                  autoComplete="cc-csc"
                  inputMode="numeric"
                  maxLength={4}
                  className={cn('text-sm', form.formState.errors.cvc && 'border-destructive')}
                  {...form.register('cvc', {
                    onChange(e) {
                      e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4);
                    },
                  })}
                />
                {form.formState.errors.cvc && (
                  <p className="text-xs text-destructive">{form.formState.errors.cvc.message}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sunucu hatası */}
        {serverError && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {serverError}
          </p>
        )}

        <div className="flex flex-col gap-2">
          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? 'İşleniyor…' : `${plan.label} planını satın al`}
          </Button>
          <p className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
            <Lock className="h-3 w-3" />
            Kart bilgileriniz şifrelenerek işlenir ve platformumuzda saklanmaz.
          </p>
        </div>
      </form>
    </div>
  );
}
