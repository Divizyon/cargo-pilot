import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function ErrorPage() {
  const navigate = useNavigate();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
      <h1 className="text-2xl font-semibold">Erişim Reddedildi</h1>
      <p className="text-sm text-muted-foreground">Bu sayfayı görüntüleme yetkiniz yok.</p>
      <Button variant="outline" onClick={() => navigate('/dashboard')}>
        Dashboard'a Dön
      </Button>
    </main>
  );
}
