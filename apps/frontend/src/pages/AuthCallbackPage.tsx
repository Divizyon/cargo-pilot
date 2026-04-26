import { AuthLayout } from '@/features/platform/components/AuthLayout';
import { OAuthCallback } from '@/features/platform/components/OAuthCallback';

export function AuthCallbackPage() {
  return (
    <AuthLayout>
      <OAuthCallback />
    </AuthLayout>
  );
}
