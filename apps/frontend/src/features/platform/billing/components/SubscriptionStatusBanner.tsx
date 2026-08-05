import { useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, XCircle, Undo2, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useReactivateSubscription } from '@/lib/api/useSubscription';

interface CancelledBannerProps {
  expiresAt: string;
}

export function CancelledBanner({ expiresAt }: CancelledBannerProps) {
  const { mutateAsync: reactivate, isPending } = useReactivateSubscription();
  const [done, setDone] = useState(false);

  const formatted = new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(expiresAt));

  async function handleReactivate() {
    await reactivate();
    toast.success('Abonelik iptali geri alındı.', { position: 'bottom-right' });
    setDone(true);
  }

  if (done) return null;

  return (
    <Alert className="border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-300">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <span>
          Aboneliğiniz <strong className="font-semibold">{formatted}</strong> tarihinde sona erecek.
        </span>
        <Button
          size="sm"
          variant="outline"
          className="h-7 shrink-0 border-amber-400 bg-transparent px-2 text-xs text-amber-800 hover:bg-amber-100 dark:border-amber-600 dark:text-amber-300 dark:hover:bg-amber-900/40"
          onClick={handleReactivate}
          disabled={isPending}
        >
          {isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <>
              <Undo2 className="mr-1 h-3 w-3" />
              İptali Geri Al
            </>
          )}
        </Button>
      </AlertDescription>
    </Alert>
  );
}

interface ExpiredBannerProps {
  onRenew: () => void;
}

export function ExpiredBanner({ onRenew }: ExpiredBannerProps) {
  return (
    <Alert variant="destructive">
      <XCircle className="h-4 w-4" />
      <AlertDescription className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <span>Aboneliğiniz sona erdi.</span>
        <Button
          size="sm"
          variant="outline"
          className="h-7 shrink-0 border-destructive bg-transparent px-2 text-xs text-destructive hover:bg-destructive/10"
          onClick={onRenew}
        >
          Yenile
        </Button>
      </AlertDescription>
    </Alert>
  );
}

interface PendingDowngradeBannerProps {
  targetPlan: string;
  effectiveDate: string;
}

export function PendingDowngradeBanner({ targetPlan, effectiveDate }: PendingDowngradeBannerProps) {
  const formatted = new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(effectiveDate));

  return (
    <Alert className="border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-800/40 dark:bg-sky-950/30 dark:text-sky-300">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription>
        Planınız <strong className="font-semibold">{formatted}</strong> itibarıyla{' '}
        <strong className="font-semibold">{targetPlan}</strong> olarak değişecektir.
      </AlertDescription>
    </Alert>
  );
}
