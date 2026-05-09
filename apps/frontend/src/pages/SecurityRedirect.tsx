import { useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useRevokeAllSessions } from '@/lib/api/useAuth';

export function SecurityRedirect() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const triggeredRef = useRef(false);

  const { mutate, isError } = useRevokeAllSessions();

  useEffect(() => {
    if (token && !triggeredRef.current) {
      triggeredRef.current = true;
      mutate({ token });
    }
  }, [token, mutate]);

  const showError = isError || !token;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-sm bg-card rounded-xl border shadow-sm">
        <CardContent className="flex flex-col items-center gap-4 pt-10 pb-8">
          {showError ? (
            <>
              <Alert variant="destructive">
                <AlertDescription>Bu bağlantı artık geçerli değil.</AlertDescription>
              </Alert>
              <Button variant="outline" onClick={() => navigate('/auth/login', { replace: true })}>
                Giriş sayfasına dön
              </Button>
            </>
          ) : (
            <>
              <ShieldCheck className="size-8 text-muted-foreground" />
              <p className="text-sm text-center text-foreground">
                Oturumunuz güvenli şekilde sonlandırılıyor...
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
