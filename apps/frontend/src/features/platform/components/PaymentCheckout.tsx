import { useForm, useWatch } from 'react-hook-form';
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

function displayCardNumber(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  return [0, 1, 2, 3]
    .map((i) => {
      const chunk = digits.slice(i * 4, (i + 1) * 4);
      return chunk ? chunk.padEnd(4, '·') : '····';
    })
    .join('  ');
}

interface CardPreviewProps {
  cardNumber: string;
  cardHolder: string;
  expiry: string;
}

function CardPreview({ cardNumber, cardHolder, expiry }: CardPreviewProps) {
  return (
    <div className="flex flex-col items-center justify-start pt-2">
      {/* Kart */}
      <div className="relative h-48 w-full max-w-[300px] overflow-hidden rounded-2xl border border-border bg-white p-5 shadow-md">
        {/* Chip */}
        <div className="h-7 w-10 overflow-hidden rounded-sm bg-gradient-to-br from-yellow-300 to-yellow-500 shadow-inner">
          <div className="flex h-full flex-col justify-evenly px-1">
            <div className="h-px w-full bg-yellow-700/40" />
            <div className="flex h-3 items-stretch gap-px">
              <div className="flex-1 bg-yellow-700/20" />
              <div className="w-px bg-yellow-700/40" />
              <div className="flex-1 bg-yellow-700/20" />
            </div>
            <div className="h-px w-full bg-yellow-700/40" />
          </div>
        </div>

        {/* Kart numarası */}
        <div className="mt-5 font-mono text-[13px] tracking-[0.2em] text-black">
          {displayCardNumber(cardNumber)}
        </div>

        {/* Alt: ad + tarih + mastercard */}
        <div className="mt-4 flex items-end justify-between">
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="text-[8px] uppercase tracking-widest text-black/50">Kart Sahibi</p>
            <p className="max-w-[140px] truncate text-[11px] font-semibold uppercase tracking-wider text-black">
              {cardHolder ? cardHolder.toUpperCase() : 'AD SOYAD'}
            </p>
          </div>

          <div className="flex items-end gap-3">
            <div className="flex flex-col items-end gap-0.5">
              <p className="text-[8px] uppercase tracking-widest text-black/50">Son Kullanma</p>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-black">
                {expiry || 'AA/YY'}
              </p>
            </div>
            {/* Mastercard halkaları */}
            <div className="flex">
              <div className="h-6 w-6 rounded-full bg-red-500/80" />
              <div className="-ml-2 h-6 w-6 rounded-full bg-yellow-400/80" />
            </div>
          </div>
        </div>
      </div>

      <p className="mt-3 text-center text-[10px] text-muted-foreground">
        Kart önizlemesi — veriler cihazınızda şifrelenir
      </p>
    </div>
  );
}

export function PaymentCheckout({ plan, onBack }: PaymentCheckoutProps) {
  const navigate = useNavigate();
  const setPlan = useSubscriptionStore((s) => s.setPlan);
  const { mutate: purchase, isPending, error } = usePurchaseSubscription();

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { cardHolder: '', cardNumber: '', expiry: '', cvc: '' },
  });

  const watchedValues = useWatch({ control: form.control });

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

      {/* 70 / 30 grid — PDF preview ile aynı pattern */}
      <div className="grid items-start gap-6 lg:grid-cols-10">
        {/* Sol %70: Form */}
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          noValidate
          className="flex flex-col gap-6 lg:col-span-7"
        >
          <div className="flex flex-col gap-4">
            <p className="text-sm font-semibold text-foreground">Kart Bilgileri</p>

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
                {plan.period && (
                  <span className="text-xs text-muted-foreground">{plan.period}</span>
                )}
              </div>
            </div>
          </div>

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

        {/* Sağ %30: Kart önizlemesi — sticky */}
        <aside className="lg:col-span-3 lg:sticky lg:top-6">
          <CardPreview
            cardNumber={watchedValues.cardNumber ?? ''}
            cardHolder={watchedValues.cardHolder ?? ''}
            expiry={watchedValues.expiry ?? ''}
          />
        </aside>
      </div>
    </div>
  );
}
