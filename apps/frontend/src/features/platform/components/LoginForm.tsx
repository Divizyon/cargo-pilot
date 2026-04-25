import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { axiosInstance } from '@/lib/api/axiosInstance';
import { USER_ROLES, useAuthStore } from '@/lib/store/useAuthStore';
import type { AuthUser } from '@/lib/store/useAuthStore';
import { loginSchema } from '@/features/platform/schemas/loginSchema';
import type { LoginFormValues } from '@/features/platform/schemas/loginSchema';

interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

export function LoginForm() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(values: LoginFormValues) {
    try {
      const { data } = await axiosInstance.post<LoginResponse>('/api/v1/auth/login', values);
      setAuth(data.user, data.accessToken);
      const target = data.user.role === USER_ROLES.Admin ? '/dashboard' : '/home';
      navigate(target, { replace: true });
    } catch {
      toast.error('E-posta veya şifre hatalı. Lütfen tekrar deneyin.', {
        position: 'bottom-right',
      });
    }
  }

  const isSubmitting = form.formState.isSubmitting;

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <h1 className="text-xl font-semibold">Giriş Yap</h1>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-posta</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="ornek@sirket.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Şifre</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </Button>
          </form>
        </Form>

        {/* DEV ONLY — remove before production */}
        {import.meta.env.DEV && (
          <Button
            variant="outline"
            className="mt-3 w-full border-dashed text-muted-foreground"
            onClick={() => {
              setAuth(
                {
                  id: 'dev-1',
                  email: 'dev@cargopilot.io',
                  fullName: 'Dev Admin',
                  role: USER_ROLES.Admin,
                },
                'dev-token',
              );
              navigate('/dashboard', { replace: true });
            }}
          >
            [DEV] Hızlı Giriş
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
