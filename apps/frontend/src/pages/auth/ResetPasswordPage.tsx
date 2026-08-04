import { AuthLayout } from '@/features/platform/auth/components/AuthLayout';
import { ResetPasswordForm } from '@/features/platform/auth/components/ResetPasswordForm';

export function ResetPasswordPage() {
  return (
    <AuthLayout>
      <ResetPasswordForm />
    </AuthLayout>
  );
}
