import { AuthLayout } from '@/features/platform/auth/components/AuthLayout';
import { LoginForm } from '@/features/platform/auth/components/LoginForm';

export function LoginPage() {
  return (
    <AuthLayout>
      <LoginForm />
    </AuthLayout>
  );
}
