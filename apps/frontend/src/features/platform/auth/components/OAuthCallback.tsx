// src/features/platform/components/OAuthCallback.tsx
import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/lib/store/useAuthStore';
import type { UserRole } from '@/lib/store/useAuthStore';

export function OAuthCallback() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const params = new URLSearchParams(window.location.search);
  const accessToken = params.get('accessToken');
  const refreshToken = params.get('refreshToken'); // reserved — refresh flow tarafından kullanılacak
  const userId = params.get('userId');
  const email = params.get('email');
  const fullName = params.get('fullName');
  const role = params.get('role');
  const errorParam = params.get('error');

  void refreshToken; // şu an kullanılmıyor; interceptor refresh flow'u yönetir

  const isValid = accessToken && userId && email && fullName && role;

  useEffect(() => {
    if (!isValid) return;

    setAuth(
      { id: userId!, email: email!, fullName: fullName!, role: role as UserRole },
      accessToken!,
    );
    navigate('/dashboard', { replace: true });
  }, [isValid, accessToken, userId, email, fullName, role, setAuth, navigate]);

  if (errorParam) {
    return (
      <div className="flex flex-col items-center gap-4 p-4 text-center">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <p className="text-sm text-muted-foreground">
          Sosyal giriş başarısız oldu. Lütfen tekrar deneyin.
        </p>
        <Button asChild variant="outline" size="sm">
          <Link to="/auth/login">Giriş sayfasına dön</Link>
        </Button>
      </div>
    );
  }

  if (!isValid) {
    return (
      <div className="flex flex-col items-center gap-4 p-4 text-center">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <p className="text-sm text-muted-foreground">
          Oturum bilgileri alınamadı. Lütfen tekrar giriş yapın.
        </p>
        <Button asChild variant="outline" size="sm">
          <Link to="/auth/login">Giriş sayfasına dön</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      Oturum açılıyor...
    </div>
  );
}
