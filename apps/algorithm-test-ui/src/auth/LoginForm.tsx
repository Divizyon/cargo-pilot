import { useState } from 'react';
import { isAxiosError } from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { useLogin } from '@/lib/api/useAuth';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { mutate, isPending } = useLogin();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    mutate(
      { email, password },
      {
        onError: (err) => {
          const detail = isAxiosError<{ message?: string }>(err)
            ? (err.response?.data?.message ?? err.message)
            : 'Giriş başarısız';
          setError(detail);
        },
      },
    );
  }

  return (
    <div className="flex h-full items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardContent className="p-6">
          <h1 className="mb-1 text-lg font-bold text-foreground">Algoritma Test Girişi</h1>
          <p className="mb-4 text-sm text-muted-foreground">
            Bu bağımsız araç, araç/ürün listesi için backend'de oturum gerektiriyor.
          </p>
          <form onSubmit={onSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">E-posta</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Şifre</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
