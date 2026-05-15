import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Lock, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
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
import { paymentSchema, type PaymentFormValues } from '../schemas/paymentSchema';
import { usePurchaseSubscription } from '@/lib/api/useSubscription';
import type { SubscriptionPlan } from '@/lib/store/useSubscriptionStore';

// ─── Plan meta ────────────────────────────────────────────────────────────────

const PLAN_META: Record<string, { label: string; price: string; period: string }> = {
  free: { label: 'Ücretsiz', price: '₺0', period: '/ ay' },
  starter: { label: 'Starter', price: '₺499', period: '/ ay' },
  pro: { label: 'Pro', price: '₺1.299', period: '/ ay' },
  enterprise: { label: 'Enterprise', price: 'Özel', period: '' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCardNumber(raw: string): string {
  return raw
    .replace(/\D/g, '')
    .slice(0, 16)
    .replace(/(.{4})/g, '$1 ')
    .trim();
}

function formatExpiry(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return digits;
}

function displayCardNumber(raw: string): string {
  const digits = raw.replace(/\s/g, '');
  const groups = [];
  for (let i = 0; i < 4; i++) {
    const chunk = digits.slice(i * 4, i * 4 + 4);
    groups.push(chunk.padEnd(4, '•'));
  }
  return groups.join('  ');
}

// ─── Bank card preview ────────────────────────────────────────────────────────

interface CardPreviewProps {
  cardNumber: string;
  cardholderName: string;
  expiry: string;
  cvv: string;
  cvvFocused: boolean;
}

function CardPreview({ cardNumber, cardholderName, expiry, cvvFocused }: CardPreviewProps) {
  const displayName = cardholderName.trim().toUpperCase() || 'KART SAHİBİ';
  const displayExpiry = expiry || 'AA/YY';

  return (
    <div style={{ perspective: '1000px' }} className="w-full">
      <div
        style={{
          transformStyle: 'preserve-3d',
          transition: 'transform 0.55s cubic-bezier(0.4, 0.2, 0.2, 1)',
          transform: cvvFocused ? 'rotateY(180deg)' : 'rotateY(0deg)',
          position: 'relative',
          aspectRatio: '1.586 / 1',
          width: '100%',
        }}
      >
        {/* ── Front ── */}
        <div
          style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
          className="absolute inset-0 flex flex-col justify-between rounded-2xl bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.18)]"
        >
          {/* Top row: chip + network */}
          <div className="flex items-start justify-between">
            {/* EMV Chip */}
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
            {/* Network mark */}
            <div className="flex items-center">
              <div className="h-7 w-7 rounded-full bg-black/80 opacity-90" />
              <div className="-ml-3 h-7 w-7 rounded-full bg-black/50" />
            </div>
          </div>

          {/* Card number */}
          <p className="mt-4 font-mono text-[15px] font-semibold tracking-[0.18em] text-black">
            {displayCardNumber(cardNumber)}
          </p>

          {/* Bottom row: name + expiry */}
          <div className="mt-3 flex items-end justify-between">
            <div>
              <p className="text-[9px] font-medium uppercase tracking-widest text-black/50">
                Kart Sahibi
              </p>
              <p className="mt-0.5 max-w-[140px] truncate font-mono text-[13px] font-semibold tracking-wide text-black">
                {displayName}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-medium uppercase tracking-widest text-black/50">
                Son Kullanma
              </p>
              <p className="mt-0.5 font-mono text-[13px] font-semibold tracking-wide text-black">
                {displayExpiry}
              </p>
            </div>
          </div>
        </div>

        {/* ── Back ── */}
        <div
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
          className="absolute inset-0 flex flex-col justify-start rounded-2xl bg-white shadow-[0_8px_30px_rgba(0,0,0,0.18)] overflow-hidden"
        >
          {/* Magnetic stripe */}
          <div className="mt-7 h-9 w-full bg-black/85" />

          {/* Signature + CVV strip */}
          <div className="mx-5 mt-4 flex items-center gap-2">
            <div className="flex-1 rounded bg-[repeating-linear-gradient(45deg,_#f5f5f5,_#f5f5f5_4px,_#e0e0e0_4px,_#e0e0e0_8px)] py-1.5 px-2">
              <p className="font-mono text-[11px] text-black/30 tracking-widest">{'•'.repeat(7)}</p>
            </div>
            <div className="w-12 rounded bg-white border border-black/10 py-1.5 text-center">
              <p className="font-mono text-[13px] font-bold text-black">
                {/* CVV is intentionally not shown — just placeholder */}
                CVV
              </p>
            </div>
          </div>

          <p className="mx-5 mt-4 text-[9px] leading-relaxed text-black/40">
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

  async function onSubmit(values: PaymentFormValues) {
    setApiError(null);
    try {
      const rawCardNumber = values.cardNumber.replace(/\s/g, '');
      await purchase({
        plan: initialPlan,
        paymentMethodToken: `tok_${rawCardNumber.slice(-4)}`,
        cardholderName: values.cardholderName,
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
      {/* Back */}
      <button
        type="button"
        onClick={onCancel}
        className="flex w-fit items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Geri
      </button>

      {/* 70 / 30 layout */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_280px]">
        {/* ── 70%: form ── */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            {apiError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{apiError}</AlertDescription>
              </Alert>
            )}

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
                    <Input
                      placeholder="0000 0000 0000 0000"
                      inputMode="numeric"
                      autoComplete="cc-number"
                      value={field.value}
                      onChange={(e) => field.onChange(formatCardNumber(e.target.value))}
                    />
                  </FormControl>
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
                        placeholder="•••"
                        inputMode="numeric"
                        autoComplete="cc-csc"
                        maxLength={4}
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

            <Separator />

            {/* Plan summary */}
            <div className="flex items-center justify-between py-1">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Seçilen Plan
                </p>
                <p className="mt-0.5 text-sm font-semibold text-foreground">{planMeta.label}</p>
              </div>
              <p className="text-lg font-bold text-foreground">
                {planMeta.price}
                {planMeta.period && (
                  <span className="ml-0.5 text-xs font-normal text-muted-foreground">
                    {planMeta.period}
                  </span>
                )}
              </p>
            </div>

            <Button type="submit" className="w-full gap-2" disabled={isPending}>
              {isPending ? (
                'İşleniyor...'
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Ödemeyi Tamamla — {planMeta.price} {planMeta.period}
                </>
              )}
            </Button>
          </form>
        </Form>

        {/* ── 30%: card preview ── */}
        <div className="flex items-start justify-center pt-1 lg:justify-start">
          <div className="w-full max-w-[280px]">
            <CardPreview
              cardNumber={cardNumber}
              cardholderName={cardholderName}
              expiry={expiry}
              cvv={cvv}
              cvvFocused={cvvFocused}
            />
            <p className="mt-3 text-center text-[10px] text-muted-foreground">
              CVV alanına tıkladığınızda kartın arkasını görebilirsiniz.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export { PaymentCheckoutInline as PaymentCheckoutDialog };
