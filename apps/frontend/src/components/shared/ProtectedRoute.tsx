import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/lib/store/useAuthStore';
import type { UserRole } from '@/lib/store/useAuthStore';

interface ProtectedRouteProps {
  /**
   * Rotayı görebilecek roller. Yetki çoğu yerde sekme/aksiyon düzeyinde
   * uygulanır; tüm sayfası yetkiye bağlı rotalar için buradan verilir.
   */
  requiredRoles?: readonly UserRole[];
}

export function ProtectedRoute({ requiredRoles }: ProtectedRouteProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isInitializing = useAuthStore((s) => s.isInitializing);
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  if (isInitializing) {
    return null;
  }

  if (!isAuthenticated) {
    const target = location.pathname + location.search;
    if (target !== '/' && !target.startsWith('/auth/')) {
      sessionStorage.setItem('redirect_after_login', target);
    }
    return <Navigate to="/auth/login" replace />;
  }

  if (requiredRoles && (!user?.role || !requiredRoles.includes(user.role))) {
    return <Navigate to="/error" replace />;
  }

  return <Outlet />;
}
