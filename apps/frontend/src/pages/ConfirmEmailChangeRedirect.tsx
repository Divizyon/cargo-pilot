import { Navigate, useSearchParams } from 'react-router-dom';

export function ConfirmEmailChangeRedirect() {
  const [searchParams] = useSearchParams();
  return <Navigate to={`/auth/confirm-email-change?${searchParams.toString()}`} replace />;
}
