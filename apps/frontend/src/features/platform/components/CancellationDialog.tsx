import { useState } from 'react';
import { toast } from 'sonner';
import { AlertCircle, AlertTriangle } from 'lucide-react';
import { type AxiosError } from 'axios';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCancelSubscription } from '@/lib/api/useSubscription';

interface CancellationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expiresAt: string | null;
}

interface BackendErrorBody {
  isSuccess: boolean;
  error?: { description?: string };
}

export function CancellationDialog({ open, onOpenChange, expiresAt }: CancellationDialogProps) {
  const { mutateAsync: cancel, isPending } = useCancelSubscription();
  const [apiError, setApiError] = useState<string | null>(null);

  const formattedExpiry = expiresAt
    ? new Intl.DateTimeFormat('tr-TR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(new Date(expiresAt))
    : null;

  async function handleCancel() {
    setApiError(null);
    try {
      await cancel();
      toast.info('Abonelik iptali alındı. Mevcut dönem sonuna kadar erişiminiz devam eder.', {
        position: 'bottom-right',
      });
      onOpenChange(false);
    } catch (err: unknown) {
      const axiosErr = err as AxiosError<BackendErrorBody>;
      const message = axiosErr.response?.data?.error?.description ?? 'İptal işlemi başarısız oldu.';
      setApiError(message);
    }
  }

  function handleOpenChange(v: boolean) {
    if (!v) setApiError(null);
    onOpenChange(v);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Aboneliği İptal Et</DialogTitle>
          <DialogDescription>
            İptal işlemini onaylamadan önce lütfen aşağıdaki bilgileri okuyun.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 text-sm">
          <Alert className="border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-300">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {formattedExpiry ? (
                <>
                  Aboneliğiniz <strong className="font-semibold">{formattedExpiry}</strong> tarihine
                  kadar aktif kalır. Bu tarihten sonra platformun tüm özelliklerine erişiminiz
                  kısıtlanır.
                </>
              ) : (
                'Mevcut dönem sonuna kadar tüm özelliklerinize erişmeye devam edersiniz.'
              )}
            </AlertDescription>
          </Alert>

          <p className="text-muted-foreground">
            Dönem sonunda hesabınız salt okunur moda geçer; mevcut planlarınızı ve raporlarınızı
            görüntüleyebilirsiniz ancak yeni plan oluşturamazsınız.
          </p>

          {apiError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{apiError}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isPending}>
            Vazgeç
          </Button>
          <Button variant="destructive" onClick={handleCancel} disabled={isPending}>
            {isPending ? 'İşleniyor...' : 'Aboneliği İptal Et'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
