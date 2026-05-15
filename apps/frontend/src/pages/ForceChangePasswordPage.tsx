import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { AuthLayout } from '@/features/platform/components/AuthLayout';
import { useChangePassword } from '@/lib/api/useAuth';
import {
  passwordChangeSchema,
  type PasswordChangeFormValues,
} from '@/features/platform/schemas/passwordChangeSchema';

function ForceChangePasswordForm() {
  const navigate = useNavigate();
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [wrongPassword, setWrongPassword] = useState(false);

  const { mutate: changePassword, isPending } = useChangePassword();

  const form = useForm<PasswordChangeFormValues>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
    mode: 'onBlur',
  });

  function onSubmit({ currentPassword, newPassword }: PasswordChangeFormValues) {
    setWrongPassword(false);
    changePassword(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          navigate('/dashboard', { replace: true });
        },
        onError: (err) => {
          if (err.response?.status === 401 || err.response?.status === 400) {
            setWrongPassword(true);
          }
        },
      },
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Şifrenizi Güncelleyin</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Güvenliğiniz için ilk girişte şifrenizi değiştirmeniz gerekmektedir.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {wrongPassword && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Mevcut şifreniz hatalı. Lütfen kontrol edip tekrar deneyin.</span>
            </div>
          )}

          <FormField
            control={form.control}
            name="currentPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mevcut Şifreniz</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showCurrent ? 'text' : 'password'}
                      placeholder="••••••••"
                      className="pr-10"
                      autoComplete="current-password"
                      {...field}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowCurrent((v) => !v)}
                      tabIndex={-1}
                      aria-label={showCurrent ? 'Şifreyi gizle' : 'Şifreyi göster'}
                    >
                      {showCurrent ? (
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

          <FormField
            control={form.control}
            name="newPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Yeni Şifreniz</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showNew ? 'text' : 'password'}
                      placeholder="••••••••"
                      className="pr-10"
                      autoComplete="new-password"
                      {...field}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowNew((v) => !v)}
                      tabIndex={-1}
                      aria-label={showNew ? 'Şifreyi gizle' : 'Şifreyi göster'}
                    >
                      {showNew ? (
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

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Yeni Şifreyi Tekrar Girin</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="••••••••"
                      className="pr-10"
                      autoComplete="new-password"
                      {...field}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowConfirm((v) => !v)}
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

          <Button type="submit" disabled={isPending} size="lg" className="w-full">
            {isPending ? (
              <>
                <Loader2 className="animate-spin" aria-hidden="true" />
                Güncelleniyor...
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

export function ForceChangePasswordPage() {
  return (
    <AuthLayout>
      <ForceChangePasswordForm />
    </AuthLayout>
  );
}
