import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, XCircle } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { luhnCheck } from '@/features/platform/billing/utils/luhn';
import {
  CardType,
  detectCardType,
  formatCardNumber,
  formatExpiry,
} from '@/features/platform/billing/utils/cardFormatting';
import { paymentSchema, type PaymentFormValues } from '../schemas/paymentSchema';
import { useSubscriptionStore } from '@/lib/store/useSubscriptionStore';

// ─── Card type badge ──────────────────────────────────────────────────────────

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

// ─── Component ────────────────────────────────────────────────────────────────

interface SavedCardFormProps {
  onClose: () => void;
}

export function SavedCardForm({ onClose }: SavedCardFormProps) {
  const setSavedCard = useSubscriptionStore((s) => s.setSavedCard);

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { cardholderName: '', cardNumber: '', expiry: '', cvv: '' },
  });

  const cardNumber = useWatch({ control: form.control, name: 'cardNumber' });
  const cardType = detectCardType(cardNumber);
  const cardDigits = cardNumber.replace(/\s/g, '');
  const expectedLength = cardType === CardType.Amex ? 15 : 16;
  const isCardComplete = cardDigits.length === expectedLength;
  const isCardValid = isCardComplete && luhnCheck(cardNumber);
  const isCardInvalid = isCardComplete && !luhnCheck(cardNumber);

  function onSubmit(values: PaymentFormValues) {
    const raw = values.cardNumber.replace(/\s/g, '');
    setSavedCard({
      last4: raw.slice(-4),
      network: detectCardType(raw),
      cardholderName: values.cardholderName,
      expiry: values.expiry,
    });
    onClose();
  }

  return (
    <div className="mt-2">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-3">
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
                    className="h-9"
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
                        'h-9 pr-20',
                        isCardValid && 'border-emerald-500 focus-visible:ring-emerald-500/30',
                        isCardInvalid && 'border-destructive focus-visible:ring-destructive/30',
                      )}
                      value={field.value}
                      onChange={(e) => {
                        const rawDigits = e.target.value.replace(/\D/g, '');
                        field.onChange(formatCardNumber(rawDigits, detectCardType(rawDigits)));
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
                      className="h-9"
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
                      className="h-9"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              İptal
            </Button>
            <Button type="submit" size="sm">
              Kartı Kaydet
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
