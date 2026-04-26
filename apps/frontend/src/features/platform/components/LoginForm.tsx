// src/features/platform/components/LoginForm.tsx
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
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
import { USER_ROLES, useAuthStore } from '@/lib/store/useAuthStore';
import { useLogin, isLoginNotFound } from '@/lib/api/useAuth';
import { OAUTH_GOOGLE_URL, OAUTH_MICROSOFT_URL } from '@/lib/config/env';
import { loginSchema } from '@/features/platform/schemas/loginSchema';
import type { LoginFormValues } from '@/features/platform/schemas/loginSchema';

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 shrink-0" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg viewBox="0 0 21 21" className="size-4 shrink-0" aria-hidden="true">
      <rect x="1"  y="1"  width="9" height="9" fill="#f25022" />
      <rect x="11" y="1"  width="9" height="9" fill="#7fba00" />
      <rect x="1"  y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { mutate: login, isPending, error: loginError } = useLogin();

  // AC4: hesap bulunamadı tespiti — backend "not found" kodu dönerse inline banner göster
  const accountNotFound = loginError != null && isLoginNotFound(loginError);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  function onSubmit(values: LoginFormValues) {
    login(values, {
      onError: (err) => {
        if (err.response?.status !== 401) {
          toast.error('Giriş yapılırken bir hata oluştu. Lütfen tekrar deneyin.', {
            position: 'bottom-right',
          });
          return;
        }
        // AC3: 401'de her zaman generic mesaj (hesap bulunamadı durumu inline gösterilir)
        if (!isLoginNotFound(err)) {
          toast.error('E-posta adresi veya şifre hatalıdır.', { position: 'bottom-right' });
        }
      },
    });
  }

  function handleOAuth(url: string | undefined) {
    if (!url) return;
    window.location.href = url;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Giriş Yap</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Hesabınıza erişmek için bilgilerinizi girin
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* AC4: Hesap bulunamadı inline banner */}
          {accountNotFound && (
            <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Bu e-posta adresine ait hesap bulunamadı.{' '}
                <Link
                  to="/auth/register"
                  className="font-semibold underline underline-offset-2 hover:opacity-80"
                >
                  Kayıt ol
                </Link>
                {' '}sayfasından yeni bir hesap oluşturabilirsiniz.
              </span>
            </div>
          )}

          {/* E-posta */}
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>E-posta</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="ornek@sirket.com"
                      className="pl-10"
                      {...field}
                    />
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
                <div className="flex items-center justify-between">
                  <FormLabel>Şifre</FormLabel>
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto p-0 text-xs"
                    onClick={() => navigate('/auth/forgot-password')}
                  >
                    Şifremi Unuttum?
                  </Button>
                </div>
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
                      {showPassword
                        ? <EyeOff className="h-4 w-4 text-muted-foreground" />
                        : <Eye    className="h-4 w-4 text-muted-foreground" />}
                    </Button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Giriş Yap */}
          <Button type="submit" disabled={isPending} size="lg" className="w-full">
            {isPending ? (
              <>
                <Loader2 className="animate-spin" />
                Giriş yapılıyor...
              </>
            ) : 'Giriş Yap'}
          </Button>

          {/* Onay metni */}
          <p className="text-xs text-muted-foreground text-center px-2">
            Devam ederek{' '}
            <span
              className="underline underline-offset-2 cursor-pointer hover:text-foreground transition-colors"
              onClick={() => window.open('/kvkk', '_blank')}
            >
              Gizlilik Politikası
            </span>
            {' '}ve{' '}
            <span
              className="underline underline-offset-2 cursor-pointer hover:text-foreground transition-colors"
              onClick={() => window.open('/kullanim-kosullari', '_blank')}
            >
              Kullanım Koşulları
            </span>
            'nı kabul etmiş olursunuz.
          </p>
        </form>
      </Form>

      {/* Ayraç */}
      <div className="flex items-center gap-3 my-5">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground">veya</span>
        <Separator className="flex-1" />
      </div>

      {/* Sosyal Giriş */}
      <div className="space-y-2">
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => handleOAuth(OAUTH_GOOGLE_URL)}
          disabled={!OAUTH_GOOGLE_URL}
        >
          <GoogleIcon />
          Google ile Giriş Yap
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => handleOAuth(OAUTH_MICROSOFT_URL)}
          disabled={!OAUTH_MICROSOFT_URL}
        >
          <MicrosoftIcon />
          Microsoft ile Giriş Yap
        </Button>
      </div>

      {/* Alt Link */}
      <p className="mt-5 text-center text-sm text-muted-foreground">
        Hesabın yok mu?{' '}
        <Link
          to="/auth/register"
          className="font-semibold text-foreground underline-offset-4 hover:underline"
        >
          Kayıt ol
        </Link>
      </p>

      {import.meta.env.DEV && <DevBypass />}
    </div>
  );
}

function DevBypass() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  return (
    <div className="mt-4 border-t border-dashed pt-4">
      <Button
        variant="outline"
        className="w-full border-dashed text-xs text-muted-foreground"
        onClick={() => {
          setAuth(
            { id: 'dev-1', email: 'dev@cargopilot.io', fullName: 'Dev Admin', role: USER_ROLES.Admin },
            'dev-token',
          );
          navigate('/dashboard', { replace: true });
        }}
      >
        [DEV] Hızlı Giriş
      </Button>
    </div>
  );
}
