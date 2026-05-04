import { useState } from 'react';
import { Mail, MailCheck } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { useRequestEmailChange } from '@/lib/api/useAuth';

export function EmailChangeSection() {
  const user = useAuthStore((s) => s.user);
  const [newEmail, setNewEmail] = useState('');
  const [sent, setSent] = useState(false);
  const { mutate: requestChange, isPending } = useRequestEmailChange();

  function handleSend() {
    requestChange({ newEmail }, { onSuccess: () => setSent(true) });
  }

  return (
    <Card className="rounded-xl">
      <CardHeader>
        <CardTitle className="text-base font-semibold">E-posta Değişikliği</CardTitle>
        <CardDescription>
          Yeni e-posta adresinize doğrulama bağlantısı gönderilir. Mevcut e-posta doğrulanmadan yeni
          adres aktif olmaz.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-foreground">Mevcut E-posta</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={user?.email ?? ''} disabled className="bg-muted pl-10" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="newEmail" className="text-sm font-medium text-foreground">
            Yeni E-posta
          </Label>
          <Input
            id="newEmail"
            type="email"
            placeholder="yeni@email.com"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
          />
        </div>

        {sent && (
          <Alert>
            <MailCheck className="h-4 w-4" />
            <AlertDescription>Doğrulama bağlantısı gönderildi.</AlertDescription>
          </Alert>
        )}

        <Button
          type="button"
          variant="outline"
          disabled={isPending || !newEmail}
          onClick={handleSend}
        >
          Doğrulama Gönder
        </Button>
      </CardContent>
    </Card>
  );
}
