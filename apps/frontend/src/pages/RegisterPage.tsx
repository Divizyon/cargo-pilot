import { AuthLayout } from '@/features/platform/auth/components/AuthLayout';
import { RegisterForm } from '@/features/platform/auth/components/RegisterForm';

export function RegisterPage() {
  return (
    <AuthLayout>
      <RegisterForm />
    </AuthLayout>
  );
}
