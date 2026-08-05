import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Lock, AlertCircle, CheckCircle2, ArrowLeft, XCircle } from 'lucide-react';
import { type AxiosError } from 'axios';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { luhnCheck } from '@/features/platform/billing/utils/luhn';
import {
  CardType,
  detectCardType,
  formatCardNumber,
  formatExpiry,
} from '@/features/platform/billing/utils/cardFormatting';
import { paymentSchema, type PaymentFormValues } from '../schemas/paymentSchema';
import { usePurchaseSubscription } from '@/lib/api/useSubscription';
import { useSubscriptionStore, type SubscriptionPlan } from '@/lib/store/useSubscriptionStore';

// ─── Plan meta ────────────────────────────────────────────────────────────────

const PLAN_META: Record<string, { label: string; price: string; period: string }> = {
  free: { label: 'Ücretsiz', price: '₺0', period: '/ ay' },
  starter: { label: 'Starter', price: '₺499', period: '/ ay' },
  pro: { label: 'Pro', price: '₺1.299', period: '/ ay' },
  enterprise: { label: 'Enterprise', price: 'Özel', period: '' },
};

function displayCardNumber(raw: string, cardType: CardType | null): string {
  const digits = raw.replace(/\s/g, '');
  if (cardType === CardType.Amex) {
    return [
      digits.slice(0, 4).padEnd(4, '•'),
      digits.slice(4, 10).padEnd(6, '•'),
      digits.slice(10, 15).padEnd(5, '•'),
    ].join('  ');
  }
  const groups = [];
  for (let i = 0; i < 4; i++) {
    groups.push(digits.slice(i * 4, i * 4 + 4).padEnd(4, '•'));
  }
  return groups.join('  ');
}

// ─── Card type badge (input field) ────────────────────────────────────────────

function CardTypeBadge({ cardType }: { cardType: CardType | null }) {
  if (cardType === CardType.Visa) {
    return (
      <span className="rounded bg-[#1a1f71] px-1.5 py-0.5 font-bold italic text-[10px] tracking-wider text-white">
        VISA
      </span>
    );
  }
  if (cardType === CardType.Mastercard) {
    return (
      <div className="flex items-center">
        <div className="h-4 w-4 rounded-full bg-red-500" />
        <div className="-ml-1.5 h-4 w-4 rounded-full bg-yellow-400 opacity-90" />
      </div>
    );
  }
  if (cardType === CardType.Amex) {
    return (
      <span className="rounded bg-[#007bc1] px-1.5 py-0.5 font-bold text-[10px] tracking-wider text-white">
        AMEX
      </span>
    );
  }
  if (cardType === CardType.Troy) {
    return (
      <span className="rounded bg-red-600 px-1.5 py-0.5 font-bold text-[10px] tracking-wider text-white">
        TROY
      </span>
    );
  }
  return null;
}

// ─── Card network mark (preview) ─────────────────────────────────────────────

function CardNetworkMark({ cardType }: { cardType: CardType | null }) {
  if (cardType === CardType.Visa) {
    return <span className="font-bold italic text-[15px] tracking-widest text-white/90">VISA</span>;
  }
  if (cardType === CardType.Amex) {
    return (
      <span className="rounded bg-white/15 px-2 py-0.5 font-bold text-[11px] tracking-widest text-white/90">
        AMEX
      </span>
    );
  }
  if (cardType === CardType.Troy) {
    return (
      <span className="rounded bg-red-500/80 px-2 py-0.5 font-bold text-[11px] tracking-widest text-white/90">
        TROY
      </span>
    );
  }
  return (
    <div className="flex items-center">
      <div className="h-7 w-7 rounded-full bg-red-500 opacity-90" />
      <div className="-ml-3 h-7 w-7 rounded-full bg-yellow-400 opacity-80" />
    </div>
  );
}

// ─── Bank card preview ────────────────────────────────────────────────────────

interface CardPreviewProps {
  cardNumber: string;
  cardholderName: string;
  expiry: string;
  cvv: string;
  cvvFocused: boolean;
  cardType: CardType | null;
}

function CardPreview({
  cardNumber,
  cardholderName,
  expiry,
  cvvFocused,
  cardType,
}: CardPreviewProps) {
  const displayName = cardholderName.trim().toUpperCase() || 'KART SAHİBİ';
  const displayExpiry = expiry || 'AA/YY';

  return (
    <div className="[perspective:1000px] w-full">
      <div
        className="[transform-style:preserve-3d] relative w-full"
        style={{
          transition: 'transform 0.55s cubic-bezier(0.4, 0.2, 0.2, 1)',
          transform: cvvFocused ? 'rotateY(180deg)' : 'rotateY(0deg)',
          aspectRatio: '1.586 / 1',
        }}
      >
        {/* ── Front ── */}
        <div className="absolute inset-0 [backface-visibility:hidden] flex flex-col justify-between rounded-2xl bg-gradient-to-br from-slate-800 to-slate-950 p-5 shadow-[0_8px_32px_rgba(0,0,0,0.32)]">
          <div className="flex items-start justify-between">
            <svg width="38" height="30" viewBox="0 0 38 30" fill="none">
              <rect
                x="0.5"
                y="0.5"
                width="37"
                height="29"
                rx="5.5"
                fill="#D4AF37"
                stroke="#B8960C"
              />
              <rect x="13" y="0.5" width="12" height="29" fill="#C9A227" />
              <rect x="0.5" y="10" width="37" height="10" fill="#C9A227" />
              <rect x="13" y="10" width="12" height="10" fill="#B8960C" />
            </svg>
            <CardNetworkMark cardType={cardType} />
          </div>

          <p className="mt-4 font-mono text-[15px] font-semibold tracking-[0.18em] text-white/90">
            {displayCardNumber(cardNumber, cardType)}
          </p>

          <div className="mt-3 flex items-end justify-between">
            <div>
              <p className="text-[9px] font-medium uppercase tracking-widest text-white/50">
                Kart Sahibi
              </p>
              <p className="mt-0.5 max-w-[140px] truncate font-mono text-[13px] font-semibold tracking-wide text-white">
                {displayName}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-medium uppercase tracking-widest text-white/50">
                Son Kullanma
              </p>
              <p className="mt-0.5 font-mono text-[13px] font-semibold tracking-wide text-white">
                {displayExpiry}
              </p>
            </div>
          </div>
        </div>

        {/* ── Back ── */}
        <div
          className="absolute inset-0 [backface-visibility:hidden] flex flex-col justify-start rounded-2xl bg-gradient-to-br from-slate-800 to-slate-950 overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.32)]"
          style={{ transform: 'rotateY(180deg)' }}
        >
          <div className="mt-7 h-9 w-full bg-black/60" />
          <div className="mx-5 mt-4 flex items-center gap-2">
            <div className="flex-1 rounded bg-[repeating-linear-gradient(45deg,_#44445a,_#44445a_4px,_#3a3a50_4px,_#3a3a50_8px)] py-1.5 px-2">
              <p className="font-mono text-[11px] text-white/20 tracking-widest">{'•'.repeat(7)}</p>
            </div>
            <div className="w-12 rounded bg-white/90 border border-white/10 py-1.5 text-center">
              <p className="font-mono text-[13px] font-bold text-slate-800">CVV</p>
            </div>
          </div>
          <p className="mx-5 mt-4 text-[9px] leading-relaxed text-white/40">
            Bu kart güvenli ödeme sistemleri aracılığıyla işlenir. Kart bilgileriniz platform
            veritabanında saklanmaz.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Backend error shape ───────────────────────────────────────────────────────

interface BackendErrorBody {
  isSuccess: boolean;
  error?: { description?: string };
}

// ─── Main component ───────────────────────────────────────────────────────────

interface PaymentCheckoutInlineProps {
  initialPlan: SubscriptionPlan;
  onCancel: () => void;
}

export function PaymentCheckoutInline({ initialPlan, onCancel }: PaymentCheckoutInlineProps) {
  const navigate = useNavigate();
  const { mutateAsync: purchase, isPending } = usePurchaseSubscription();
  const [apiError, setApiError] = useState<string | null>(null);
  const [cvvFocused, setCvvFocused] = useState(false);

  const planMeta = PLAN_META[initialPlan] ?? PLAN_META['starter'];

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { cardholderName: '', cardNumber: '', expiry: '', cvv: '' },
  });

  const cardNumber = useWatch({ control: form.control, name: 'cardNumber' });
  const cardholderName = useWatch({ control: form.control, name: 'cardholderName' });
  const expiry = useWatch({ control: form.control, name: 'expiry' });
  const cvv = useWatch({ control: form.control, name: 'cvv' });

  const cardType = detectCardType(cardNumber);
  const cardDigits = cardNumber.replace(/\s/g, '');
  const expectedLength = cardType === CardType.Amex ? 15 : 16;
  const isCardComplete = cardDigits.length === expectedLength;
  const isCardValid = isCardComplete && luhnCheck(cardNumber);
  const isCardInvalid = isCardComplete && !luhnCheck(cardNumber);

  async function onSubmit(values: PaymentFormValues) {
    setApiError(null);
    try {
      const rawCardNumber = values.cardNumber.replace(/\s/g, '');
      await purchase({
        plan: initialPlan,
        paymentMethodToken: `tok_${rawCardNumber.slice(-4)}`,
        cardholderName: values.cardholderName,
      });
      useSubscriptionStore.getState().setSavedCard({
        last4: rawCardNumber.slice(-4),
        network: detectCardType(rawCardNumber),
        cardholderName: values.cardholderName,
        expiry: values.expiry,
      });
      toast.success('Aboneliğiniz başarıyla başlatıldı.', { position: 'bottom-right' });
      navigate('/dashboard');
    } catch (err: unknown) {
      const axiosErr = err as AxiosError<BackendErrorBody>;
      const message =
        axiosErr.response?.data?.error?.description ??
        'Ödeme işlemi başarısız oldu. Lütfen kart bilgilerinizi kontrol edin.';
      setApiError(message);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <button
        type="button"
        onClick={onCancel}
        className="flex w-fit items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Geri
      </button>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_280px]">
        {/* ── Form ── */}
        <Form {...form}>
          <form
            id="payment-form"
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            <FormField
              control={form.control}
              name="cardholderName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kart Sahibinin Adı</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ad Soyad"
                      autoComplete="cc-name"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cardNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kart Numarası</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        placeholder="0000 0000 0000 0000"
                        inputMode="numeric"
                        autoComplete="cc-number"
                        className={cn(
                          'pr-20',
                          isCardValid && 'border-emerald-500 focus-visible:ring-emerald-500/30',
                          isCardInvalid && 'border-destructive focus-visible:ring-destructive/30',
                        )}
                        value={field.value}
                        onChange={(e) => {
                          const rawDigits = e.target.value.replace(/\D/g, '');
                          const detected = detectCardType(rawDigits);
                          field.onChange(formatCardNumber(rawDigits, detected));
                        }}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                        {isCardValid && (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                        )}
                        {isCardInvalid && <XCircle className="h-4 w-4 shrink-0 text-destructive" />}
                        <CardTypeBadge cardType={cardType} />
                      </div>
                    </div>
                  </FormControl>
                  {isCardInvalid && (
                    <p className="text-[12px] font-medium text-destructive">
                      Geçersiz kart numarası.
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="expiry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Son Kullanma</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="AA/YY"
                        inputMode="numeric"
                        autoComplete="cc-exp"
                        value={field.value}
                        onChange={(e) => field.onChange(formatExpiry(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cvv"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CVV</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder={cardType === CardType.Amex ? '••••' : '•••'}
                        inputMode="numeric"
                        autoComplete="cc-csc"
                        maxLength={cardType === CardType.Amex ? 4 : 3}
                        {...field}
                        onFocus={() => setCvvFocused(true)}
                        onBlur={() => {
                          setCvvFocused(false);
                          field.onBlur();
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Lock className="h-3 w-3" />
              256-bit SSL ile şifrelendi
            </div>
          </form>
        </Form>

        {/* ── Card preview + Order summary ── */}
        <div className="flex flex-col gap-4">
          <div>
            <CardPreview
              cardNumber={cardNumber}
              cardholderName={cardholderName}
              expiry={expiry}
              cvv={cvv}
              cvvFocused={cvvFocused}
              cardType={cardType}
            />
            <p className="mt-3 text-center text-[10px] text-muted-foreground">
              CVV alanına tıkladığınızda kartın arkasını görebilirsiniz.
            </p>
          </div>

          <Separator />

          {/* Order summary */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Seçilen Plan
              </p>
              <p className="mt-0.5 text-sm font-semibold text-foreground">{planMeta.label}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-foreground">
                {planMeta.price}
                {planMeta.period && (
                  <span className="ml-0.5 text-xs font-normal text-muted-foreground">
                    {planMeta.period}
                  </span>
                )}
              </p>
              {planMeta.period && <p className="text-[10px] text-muted-foreground">KDV dahil</p>}
            </div>
          </div>

          {apiError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{apiError}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" form="payment-form" className="w-full gap-2" disabled={isPending}>
            {isPending ? (
              'İşleniyor...'
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Ödemeyi Tamamla — {planMeta.price} {planMeta.period}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export { PaymentCheckoutInline as PaymentCheckoutDialog };
