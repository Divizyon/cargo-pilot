import { AuthLayout } from '@/features/platform/components/AuthLayout';
import { ForgotPasswordForm } from '@/features/platform/components/ForgotPasswordForm';

export function ForgotPasswordPage() {
  return (
    <AuthLayout>
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
