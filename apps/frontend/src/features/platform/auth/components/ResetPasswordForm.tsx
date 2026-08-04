// src/features/platform/components/ResetPasswordForm.tsx
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Lock,
  ShieldCheck,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useResetPassword, isResetTokenInvalid, isPasswordReused } from '@/lib/api/useAuth';
import { resetPasswordSchema } from '@/features/platform/auth/schemas/resetPasswordSchema';
import type { ResetPasswordFormValues } from '@/features/platform/auth/schemas/resetPasswordSchema';

const PASSWORD_RULES = [
  { label: 'En az 8 karakter', test: (v: string) => v.length >= 8 },
  { label: 'En az 1 büyük harf', test: (v: string) => /[A-Z]/.test(v) },
  { label: 'En az 1 küçük harf', test: (v: string) => /[a-z]/.test(v) },
  { label: 'En az 1 rakam', test: (v: string) => /[0-9]/.test(v) },
];

const STRENGTH = {
  0: { label: 'Zayıf', value: 25, color: '[&>*]:bg-destructive' },
  1: { label: 'Zayıf', value: 25, color: '[&>*]:bg-destructive' },
  2: { label: 'Orta', value: 50, color: '[&>*]:bg-yellow-500' },
  3: { label: 'Orta', value: 65, color: '[&>*]:bg-yellow-500' },
  4: { label: 'Güçlü', value: 100, color: '[&>*]:bg-green-500' },
} as const;

function InvalidTokenState() {
  return (
    <div>
      <div className="mb-6 flex flex-col items-center text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="h-6 w-6 text-destructive" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Bağlantı Geçersiz</h1>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          Bu bağlantı geçersiz veya süresi dolmuş. Yeni bir sıfırlama bağlantısı talep edin.
        </p>
      </div>

      <Button asChild size="lg" className="w-full">
        <Link to="/auth/forgot-password">Tekrar Dene</Link>
      </Button>
    </div>
  );
}

export function ResetPasswordForm() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [tokenInvalid, setTokenInvalid] = useState(false);

  const { mutate: resetPassword, isPending, error: resetError } = useResetPassword();

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const password = useWatch({ control: form.control, name: 'password' }) ?? '';
  const passedCount = PASSWORD_RULES.filter((r) => r.test(password)).length as 0 | 1 | 2 | 3 | 4;
  const strength = STRENGTH[passedCount];

  const passwordReused = resetError != null && isPasswordReused(resetError);

  // Token URL'de yoksa hemen geçersiz ekranı göster
  if (!token || tokenInvalid || (resetError != null && isResetTokenInvalid(resetError))) {
    return <InvalidTokenState />;
  }

  function onSubmit(values: ResetPasswordFormValues) {
    resetPassword(
      { token: token!, password: values.password },
      {
        onError: (err) => {
          if (isResetTokenInvalid(err)) {
            setTokenInvalid(true);
          }
          // 5xx axiosInstance interceptor'ı tarafından toast ile gösterilir
        },
      },
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Yeni Şifre Belirle</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Hesabınız için yeni bir şifre oluşturun.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {/* Yeni Şifre */}
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="new-password">Yeni Şifre</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Lock
                      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <Input
                      id="new-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      className="pl-10 pr-10"
                      autoComplete="new-password"
                      aria-required="true"
                      {...field}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowPassword((p) => !p)}
                      tabIndex={-1}
                      aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </FormControl>
                <FormMessage />

                {/* Şifre güç göstergesi */}
                {password.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Şifre gücü</span>
                      <span
                        className={cn(
                          'font-medium',
                          passedCount <= 1 && 'text-destructive',
                          passedCount >= 2 && passedCount <= 3 && 'text-yellow-500',
                          passedCount >= 4 && 'text-green-600',
                        )}
                      >
                        {strength.label}
                      </span>
                    </div>
                    <Progress
                      value={strength.value}
                      className={cn('h-1.5 transition-all', strength.color)}
                    />
                    <div className="grid grid-cols-2 gap-1 pt-1">
                      {PASSWORD_RULES.map((rule) => {
                        const passed = rule.test(password);
                        return (
                          <div
                            key={rule.label}
                            className={cn(
                              'flex items-center gap-1.5 text-xs',
                              passed ? 'text-green-600' : 'text-muted-foreground',
                            )}
                          >
                            {passed ? (
                              <CheckCircle2 className="size-3 shrink-0" aria-hidden="true" />
                            ) : (
                              <XCircle
                                className="size-3 shrink-0 text-destructive"
                                aria-hidden="true"
                              />
                            )}
                            {rule.label}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </FormItem>
            )}
          />

          {/* Şifre Tekrar */}
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="confirm-password">Şifre Tekrar</FormLabel>
                <FormControl>
                  <div className="relative">
                    <ShieldCheck
                      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <Input
                      id="confirm-password"
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="••••••••"
                      className="pl-10 pr-10"
                      autoComplete="new-password"
                      aria-required="true"
                      {...field}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowConfirm((p) => !p)}
                      tabIndex={-1}
                      aria-label={showConfirm ? 'Şifreyi gizle' : 'Şifreyi göster'}
                    >
                      {showConfirm ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* AC3: Parola geçmişi ihlali inline banner */}
          {passwordReused && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Daha önce kullandığınız bir şifreyi kullanamazsınız.</span>
            </div>
          )}

          <Button type="submit" disabled={isPending} size="lg" className="w-full">
            {isPending ? (
              <>
                <Loader2 className="animate-spin" aria-hidden="true" />
                Güncelleniyor…
              </>
            ) : (
              'Şifremi Güncelle'
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
}
