import { type ReactNode, useState } from 'react';
import { MailCheck } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { useRequestEmailChange } from '@/lib/api/useAuth';

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="pb-1 pt-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground first:pt-0">
      {children}
    </p>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-6 border-b border-border py-2.5 last:border-0">
      <div className="w-44 shrink-0 pt-1.5 text-sm text-foreground">{label}</div>
      <div className="w-52">{children}</div>
    </div>
  );
}

export function EmailChangeSection() {
  const user = useAuthStore((s) => s.user);
  const [newEmail, setNewEmail] = useState('');
  const [sent, setSent] = useState(false);
  const { mutate: requestChange, isPending } = useRequestEmailChange();

  function handleSend() {
    requestChange({ newEmail }, { onSuccess: () => setSent(true) });
  }

  return (
    <div className="max-w-xl">
      <SectionLabel>E-posta Değişikliği</SectionLabel>
      <p className="mb-2 text-xs text-muted-foreground">
        Yeni e-posta adresinize doğrulama bağlantısı gönderilir. Mevcut e-posta doğrulanmadan yeni
        adres aktif olmaz.
      </p>

      <Row label="Mevcut E-posta">
        <Input value={user?.email ?? ''} disabled className="h-8 bg-muted text-sm" />
      </Row>

      <Row label="Yeni E-posta">
        <Input
          id="newEmail"
          type="email"
          placeholder="yeni@email.com"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          className="h-8 text-sm"
        />
      </Row>

      {sent && (
        <Alert className="mt-3 max-w-xl">
          <MailCheck className="h-4 w-4" />
          <AlertDescription>Doğrulama bağlantısı gönderildi.</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end pt-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isPending || !newEmail}
          onClick={handleSend}
          className="min-w-36"
        >
          Doğrulama Gönder
        </Button>
      </div>
    </div>
  );
}
