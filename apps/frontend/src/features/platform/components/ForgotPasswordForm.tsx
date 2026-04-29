// src/features/platform/components/ForgotPasswordForm.tsx
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { Mail, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useForgotPassword } from '@/lib/api/useAuth';
import { forgotPasswordSchema } from '@/features/platform/schemas/forgotPasswordSchema';
import type { ForgotPasswordFormValues } from '@/features/platform/schemas/forgotPasswordSchema';

export function ForgotPasswordForm() {
  const [submitted, setSubmitted] = useState(false);
  const { mutate: sendReset, isPending } = useForgotPassword();

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  function onSubmit(values: ForgotPasswordFormValues) {
    sendReset(values, {
      onSuccess: () => setSubmitted(true),
      onError: (err) => {
        // AC3: 4xx'te (404 dahil) hesap varlığını açıklamamak için aynı mesajı göster
        // 5xx hatası axiosInstance interceptor'ı tarafından toast ile gösterilir
        if (err.response != null && err.response.status < 500) {
          setSubmitted(true);
        }
      },
    });
  }

  if (submitted) {
    return (
      <div>
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle2 className="h-6 w-6 text-primary" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">E-posta Gönderildi</h1>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            Eğer bu e-posta adresiyle kayıtlı bir hesap varsa şifre sıfırlama bağlantısı
            gönderildi. Gelen kutunuzu ve spam klasörünüzü kontrol edin.
          </p>
        </div>

        <Link
          to="/auth/login"
          className="mt-4 block text-center text-sm font-semibold text-foreground underline-offset-4 hover:underline"
        >
          Giriş sayfasına dön
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Şifremi Unuttum</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          E-posta adresinizi girin; şifre sıfırlama bağlantısı göndereceğiz.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="forgot-email">E-posta</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Mail
                      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <Input
                      id="forgot-email"
                      type="email"
                      placeholder="ornek@sirket.com"
                      className="pl-10"
                      autoComplete="email"
                      aria-required="true"
                      {...field}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" disabled={isPending} size="lg" className="w-full">
            {isPending ? (
              <>
                <Loader2 className="animate-spin" aria-hidden="true" />
                Gönderiliyor…
              </>
            ) : (
              'Sıfırlama Bağlantısı Gönder'
            )}
          </Button>
        </form>
      </Form>

      <p className="mt-5 text-center text-sm text-muted-foreground">
        <Link
          to="/auth/login"
          className="font-semibold text-foreground underline-offset-4 hover:underline"
        >
          Giriş sayfasına dön
        </Link>
      </p>
    </div>
  );
}
