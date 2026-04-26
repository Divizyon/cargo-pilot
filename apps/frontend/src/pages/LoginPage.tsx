import { AuthLayout } from '@/features/platform/components/AuthLayout';
import { LoginForm } from '@/features/platform/components/LoginForm';

export function LoginPage() {
  return (
    <AuthLayout>
      <LoginForm />
    </AuthLayout>
  );
}
