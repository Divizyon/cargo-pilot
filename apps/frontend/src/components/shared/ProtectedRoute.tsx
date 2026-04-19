import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/lib/store/useAuthStore';
import type { UserRole } from '@/lib/store/useAuthStore';

interface ProtectedRouteProps {
  requiredRole?: UserRole;
}

export function ProtectedRoute({ requiredRole }: ProtectedRouteProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/error" replace />;
  }

  return <Outlet />;
}
