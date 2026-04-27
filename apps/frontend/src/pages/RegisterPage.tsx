import { AuthLayout } from '@/features/platform/components/AuthLayout';
import { RegisterForm } from '@/features/platform/components/RegisterForm';

export function RegisterPage() {
  return (
    <AuthLayout>
      <RegisterForm />
    </AuthLayout>
  );
}
