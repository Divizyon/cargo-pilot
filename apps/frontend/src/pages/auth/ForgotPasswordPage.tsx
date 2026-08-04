import { AuthLayout } from '@/features/platform/auth/components/AuthLayout';
import { ForgotPasswordForm } from '@/features/platform/auth/components/ForgotPasswordForm';

export function ForgotPasswordPage() {
  return (
    <AuthLayout>
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
