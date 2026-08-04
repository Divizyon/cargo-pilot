import { AuthLayout } from '@/features/platform/auth/components/AuthLayout';
import { OAuthCallback } from '@/features/platform/auth/components/OAuthCallback';

export function AuthCallbackPage() {
  return (
    <AuthLayout>
      <OAuthCallback />
    </AuthLayout>
  );
}
