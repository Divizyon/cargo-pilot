import { AuthLayout } from '@/features/platform/components/AuthLayout';
import { ResetPasswordForm } from '@/features/platform/components/ResetPasswordForm';

export function ResetPasswordPage() {
  return (
    <AuthLayout>
      <ResetPasswordForm />
    </AuthLayout>
  );
}
