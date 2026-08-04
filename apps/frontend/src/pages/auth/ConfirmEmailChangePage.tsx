import { Link, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AuthLayout } from '@/features/platform/auth/components/AuthLayout';
import { useConfirmEmailChange } from '@/lib/api/useAuth';

function ConfirmEmailChangeContent() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const { isPending, isSuccess, isError } = useConfirmEmailChange(token);

  if (!token) {
    return (
      <div className="flex flex-col items-center text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="h-6 w-6 text-destructive" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Geçersiz Bağlantı</h1>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          Bu bağlantı geçersiz. Lütfen e-postanızdaki doğrulama bağlantısını kullanın.
        </p>
        <Button asChild size="lg" className="mt-6 w-full">
          <Link to="/auth/login">Giriş Yap</Link>
        </Button>
      </div>
    );
  }

  if (isPending) {
    return (
      <div className="flex flex-col items-center text-center">
        <Loader2 className="mb-4 h-10 w-10 animate-spin text-primary" aria-hidden="true" />
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Doğrulanıyor...</h1>
        <p className="mt-3 text-sm text-muted-foreground">E-posta adresiniz doğrulanıyor.</p>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
          <CheckCircle2 className="h-6 w-6 text-green-600" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">E-posta Değiştirildi</h1>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          E-posta adresiniz başarıyla güncellendi. Yeni adresinizle giriş yapabilirsiniz.
        </p>
        <Button asChild size="lg" className="mt-6 w-full">
          <Link to="/auth/login">Giriş Yap</Link>
        </Button>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="h-6 w-6 text-destructive" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Bağlantı Geçersiz</h1>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          Bu bağlantı geçersiz veya süresi dolmuş. Yeni bir değişiklik talebinde bulunun.
        </p>
        <Button asChild size="lg" className="mt-6 w-full">
          <Link to="/auth/login">Giriş Yap</Link>
        </Button>
      </div>
    );
  }

  return null;
}

export function ConfirmEmailChangePage() {
  return (
    <AuthLayout>
      <ConfirmEmailChangeContent />
    </AuthLayout>
  );
}
