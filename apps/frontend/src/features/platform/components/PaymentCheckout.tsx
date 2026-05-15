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
import { usePurchaseSubscription } from '@/lib/api/useSubscription';
import { useSubscriptionStore, type SubscriptionPlan } from '@/lib/store/useSubscriptionStore';
import axios from 'axios';

interface PlanSummary {
  key: SubscriptionPlan;
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
    defaultValues: { cardholderName: '', cardNumber: '', expiry: '', cvv: '' },
  });

  const serverError = error
    ? axios.isAxiosError(error) && error.response?.data?.message
      ? (error.response.data.message as string)
      : 'Ödeme işlemi başarısız oldu. Lütfen tekrar deneyin.'
    : null;

  function onSubmit(values: PaymentFormValues) {
    purchase(
      {
        plan: plan.key,
        cardholderName: values.cardholderName,
        paymentMethodToken: values.cardNumber.replace(/\s/g, ''),
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
    <div className="flex flex-col gap-6">
      {/* Geri butonu */}
      <button
        type="button"
        onClick={onBack}
        className="flex w-fit items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Plan seçimine dön
      </button>

      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
        {/* Kart bilgileri */}
        <div className="flex flex-col gap-4">
          <p className="text-sm font-semibold text-foreground">Kart Bilgileri</p>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cardholderName" className="text-xs">
              Kart Sahibi
            </Label>
            <Input
              id="cardholderName"
              placeholder="Ad Soyad"
              autoComplete="cc-name"
              className={cn(
                'text-sm',
                form.formState.errors.cardholderName && 'border-destructive',
              )}
              {...form.register('cardholderName')}
            />
            {form.formState.errors.cardholderName && (
              <p className="text-xs text-destructive">
                {form.formState.errors.cardholderName.message}
              </p>
            )}
          </div>

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
              <p className="text-xs text-destructive">{form.formState.errors.cardNumber.message}</p>
            )}
          </div>

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
              <Label htmlFor="cvv" className="text-xs">
                CVC
              </Label>
              <Input
                id="cvv"
                placeholder="123"
                autoComplete="cc-csc"
                inputMode="numeric"
                maxLength={4}
                className={cn('text-sm', form.formState.errors.cvv && 'border-destructive')}
                {...form.register('cvv', {
                  onChange(e) {
                    e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4);
                  },
                })}
              />
              {form.formState.errors.cvv && (
                <p className="text-xs text-destructive">{form.formState.errors.cvv.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Ayırıcı */}
        <div className="border-t border-border" />

        {/* Plan özeti */}
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Seçilen Plan
          </p>
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-semibold text-foreground">{plan.label}</span>
            <div className="flex items-baseline gap-0.5">
              <span className="text-base font-bold text-foreground">{plan.price}</span>
              {plan.period && <span className="text-xs text-muted-foreground">{plan.period}</span>}
            </div>
          </div>
        </div>

        {/* Sunucu hatası */}
        {serverError && <p className="text-sm text-destructive">{serverError}</p>}

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
