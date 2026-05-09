import { useState } from 'react';
import { Mail } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface EmailShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
  planName: string;
}

export function EmailShareDialog({ open, onOpenChange, planId, planName }: EmailShareDialogProps) {
  const [email, setEmail] = useState('');

  const handleSend = () => {
    const subject = encodeURIComponent(`CargoPilot - Yükleme Planı: ${planName}`);
    const body = encodeURIComponent(
      `Merhaba,\n\n"${planName}" yükleme planını sizinle paylaşıyorum.\n\nPlan detaylarına aşağıdaki bağlantıdan ulaşabilirsiniz:\n${window.location.origin}/planning/${planId}\n\nİyi çalışmalar.`,
    );
    window.open(`mailto:${email}?subject=${subject}&body=${body}`);
    setEmail('');
    onOpenChange(false);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) setEmail('');
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            E-posta ile Paylaş
          </DialogTitle>
          <DialogDescription>
            <span className="font-medium text-zinc-800">{planName}</span> planını e-posta ile gönderin.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="share-email">Alıcı E-posta</Label>
            <Input
              id="share-email"
              type="email"
              placeholder="ornek@firma.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && email) handleSend();
              }}
            />
          </div>
          <Button onClick={handleSend} disabled={!email} className="w-full">
            E-posta İstemcisinde Aç
          </Button>
          <p className="text-xs text-zinc-400 text-center">
            Varsayılan e-posta istemciniz açılacaktır.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
