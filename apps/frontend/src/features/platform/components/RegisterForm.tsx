// src/features/platform/components/RegisterForm.tsx
import { useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  ShieldCheck,
  Building2,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
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
import { useRegister, isEmailDuplicate } from '@/lib/api/useAuth';
import { OAUTH_GOOGLE_URL, OAUTH_MICROSOFT_URL } from '@/lib/config/env';
import { registerSchema } from '@/features/platform/schemas/registerSchema';
import type { RegisterFormValues } from '@/features/platform/schemas/registerSchema';

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

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 shrink-0" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg viewBox="0 0 21 21" className="size-4 shrink-0" aria-hidden="true">
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}

export function RegisterForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { mutate: register, isPending, error: registerError } = useRegister();
  const emailDuplicate = registerError != null && isEmailDuplicate(registerError);

  function handleOAuth(url: string | undefined) {
    if (!url) return;
    window.location.href = url;
  }

  const formRef = useRef<HTMLFormElement>(null);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      companyName: undefined,
      password: '',
      confirmPassword: '',
    },
    mode: 'onBlur',
  });

  function handleFormSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (formRef.current && !formRef.current.reportValidity()) return;
    form.handleSubmit(onSubmit)(e);
  }

  const password = useWatch({ control: form.control, name: 'password' }) ?? '';
  const passedCount = PASSWORD_RULES.filter((r) => r.test(password)).length as 0 | 1 | 2 | 3 | 4;
  const strength = STRENGTH[passedCount];

  function onSubmit(values: RegisterFormValues) {
    register(values);
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Hesap Oluştur</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Cargo Pilot'a katılmak için bilgilerinizi girin
        </p>
      </div>

      <Form {...form}>
        <form ref={formRef} onSubmit={handleFormSubmit} className="space-y-4" noValidate>
          {/* AC5: E-posta zaten kullanılıyor inline banner */}
          {emailDuplicate && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive dark:text-red-400">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Bu e-posta adresi zaten kullanılıyor.</span>
            </div>
          )}

          {/* Ad / Soyad */}
          <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ad</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input placeholder="Adınız" className="pl-10" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Soyad</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input placeholder="Soyadınız" className="pl-10" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Mail Adresi */}
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mail Adresi</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="ornek@sirket.com"
                      className={cn(
                        'pl-10',
                        form.formState.errors.email &&
                          'border-2 border-[#E24B4A] bg-[#E24B4A]/5 focus-visible:ring-0 focus-visible:border-[#E24B4A]',
                      )}
                      {...field}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Firma Adı */}
          <FormField
            control={form.control}
            name="companyName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Firma Adı{' '}
                  <span className="text-xs font-normal text-muted-foreground">(opsiyonel)</span>
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder="Firma adı" className="pl-10" {...field} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Şifre */}
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Şifre</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      className="pl-10 pr-10"
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
                              <CheckCircle2 className="size-3 shrink-0" />
                            ) : (
                              <XCircle className="size-3 shrink-0 text-destructive" />
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

          {/* Şifre Tekrarı */}
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Şifre Tekrarı</FormLabel>
                <FormControl>
                  <div className="relative">
                    <ShieldCheck className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      className="pl-10 pr-10"
                      {...field}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword((p) => !p)}
                      tabIndex={-1}
                      aria-label={showConfirmPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                    >
                      {showConfirmPassword ? (
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

          {/* Kayıt Ol */}
          <Button
            type="submit"
            disabled={isPending}
            size="lg"
            className="w-full text-[18px] font-bold"
          >
            {isPending ? (
              <>
                <Loader2 className="animate-spin" />
                Kayıt yapılıyor...
              </>
            ) : (
              'Kayıt Ol'
            )}
          </Button>

          {/* Onay metni */}
          <p className="text-xs text-muted-foreground text-center px-2">
            Devam ederek Gizlilik Politikası ve Kullanım Koşulları'nı kabul etmiş olursunuz.
          </p>
        </form>
      </Form>

      {/* Ayraç */}
      <div className="flex items-center gap-3 my-5">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground">veya</span>
        <Separator className="flex-1" />
      </div>

      {/* Sosyal Kayıt */}
      <div className="space-y-2">
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => handleOAuth(OAUTH_GOOGLE_URL)}
          disabled={!OAUTH_GOOGLE_URL}
        >
          <GoogleIcon />
          Google ile Kayıt Ol
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => handleOAuth(OAUTH_MICROSOFT_URL)}
          disabled={!OAUTH_MICROSOFT_URL}
        >
          <MicrosoftIcon />
          Microsoft ile Kayıt Ol
        </Button>
      </div>

      {/* Alt Link */}
      <p className="mt-5 text-center text-sm text-muted-foreground">
        Zaten hesabın var mı?{' '}
        <Link
          to="/auth/login"
          className="text-base font-bold text-foreground underline-offset-4 hover:underline"
        >
          Giriş yap
        </Link>
      </p>
    </div>
  );
}
