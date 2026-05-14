import { AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  useSubscriptionStore,
  selectIsSubscriptionExpired,
} from '@/lib/store/useSubscriptionStore';

export function SubscriptionExpiredBanner() {
  const navigate = useNavigate();
  const isExpired = useSubscriptionStore(selectIsSubscriptionExpired);

  if (!isExpired) return null;

  return (
    <div className="flex items-center gap-3 border-b border-destructive/30 bg-destructive/10 px-6 py-2.5">
      <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
      <p className="flex-1 text-sm text-foreground">
        <span className="font-medium">Aboneliğiniz sona erdi.</span> Mevcut planlarınızı ve
        raporlarınızı görüntüleyebilirsiniz; yeni plan oluşturmak için aboneliğinizi yenileyin.
      </p>
      <Button
        size="sm"
        variant="destructive"
        className="shrink-0 text-xs"
        onClick={() => navigate('/settings?tab=abonelik')}
      >
        Aboneliği Yenile
      </Button>
    </div>
  );
}
