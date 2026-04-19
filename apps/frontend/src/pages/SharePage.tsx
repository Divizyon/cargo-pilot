import { useParams } from 'react-router-dom';

export function SharePage() {
  const { token } = useParams<{ token: string }>();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background">
      <p className="text-sm text-muted-foreground">Paylaşılan plan yükleniyor… ({token})</p>
    </main>
  );
}
