import { useState } from 'react';
import { Copy, Check, Link } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateShareLink } from '@/lib/api/useShareLinks';
import { ShareValidity } from '@/lib/types/share';

interface ShareLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
  planName: string;
}

const VALIDITY_OPTIONS: Array<{ value: ShareValidity; label: string; hint: string }> = [
  { value: ShareValidity.H24, label: '24 Saat', hint: 'Bu bağlantı 24 saat geçerlidir.' },
  { value: ShareValidity.D7, label: '7 Gün', hint: 'Bu bağlantı 7 gün geçerlidir.' },
  { value: ShareValidity.Unlimited, label: 'Süresiz', hint: 'Bu bağlantının geçerlilik süresi yoktur.' },
];

export function ShareLinkDialog({ open, onOpenChange, planId, planName }: ShareLinkDialogProps) {
  const [validity, setValidity] = useState<ShareValidity>(ShareValidity.D7);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { mutate: createShareLink, isPending } = useCreateShareLink();

  const selectedOption = VALIDITY_OPTIONS.find((o) => o.value === validity) ?? VALIDITY_OPTIONS[1];

  const handleCreate = () => {
    createShareLink(
      { planId, validity },
      {
        onSuccess: (shareLink) => {
          const link = `${window.location.origin}/share/${shareLink.token}`;
          setGeneratedLink(link);
        },
      },
    );
  };

  const handleCopy = async () => {
    if (!generatedLink) return;
    await navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    toast.success('Bağlantı panoya kopyalandı.', { position: 'bottom-right' });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setGeneratedLink(null);
      setCopied(false);
      setValidity(ShareValidity.D7);
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link className="w-4 h-4" />
            Bağlantı ile Paylaş
          </DialogTitle>
          <DialogDescription>
            <span className="font-medium text-zinc-800">{planName}</span> planını bağlantı ile paylaşın.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="validity-select">Geçerlilik Süresi</Label>
            <Select
              value={validity}
              onValueChange={(v) => setValidity(v as ShareValidity)}
              disabled={Boolean(generatedLink)}
            >
              <SelectTrigger id="validity-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VALIDITY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {generatedLink ? (
            <div className="space-y-1.5">
              <Label>Paylaşım Bağlantısı</Label>
              <div className="flex gap-2">
                <Input value={generatedLink} readOnly className="text-xs font-mono" />
                <Button variant="outline" size="icon" onClick={handleCopy}>
                  {copied ? (
                    <Check className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-zinc-500">{selectedOption.hint}</p>
            </div>
          ) : (
            <Button onClick={handleCreate} disabled={isPending} className="w-full">
              {isPending ? 'Oluşturuluyor…' : 'Bağlantı Oluştur'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
