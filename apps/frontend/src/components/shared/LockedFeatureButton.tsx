import { useState } from 'react';
import { Lock, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button, type ButtonProps } from '@/components/ui/button';
import { useSubscriptionStore } from '@/lib/store/useSubscriptionStore';
import { hasFeatureAccess, isSubscriptionExpired } from '@/lib/utils/checkFeatureAccess';
import type { FeatureKey } from '@/lib/config/plan-features';
import { UpgradeModal } from '@/features/platform/components/UpgradeModal';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface LockedFeatureButtonProps extends Omit<ButtonProps, 'onClick'> {
  feature: FeatureKey;
  onClick?: () => void;
}

function ExpiredModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const navigate = useNavigate();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="text-destructive" />
          </div>
          <DialogTitle>Aboneliğiniz sona erdi.</DialogTitle>
          <DialogDescription>
            Bu özelliği kullanmak için aboneliğinizi yenilemeniz gerekiyor.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Kapat
          </Button>
          <Button
            onClick={() => {
              onOpenChange(false);
              navigate('/settings?tab=abonelik');
            }}
          >
            Aboneliği Yenile
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function LockedFeatureButton({
  feature,
  onClick,
  children,
  className,
  variant,
  disabled,
  ...rest
}: LockedFeatureButtonProps) {
  const plan = useSubscriptionStore((s) => s.plan);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [expiredOpen, setExpiredOpen] = useState(false);

  const expired = isSubscriptionExpired();
  const isUnlocked = !expired && hasFeatureAccess(plan, feature);

  const handleClick = () => {
    if (expired) {
      setExpiredOpen(true);
    } else if (isUnlocked) {
      onClick?.();
    } else {
      setUpgradeOpen(true);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant={isUnlocked ? variant : 'outline'}
        disabled={disabled}
        aria-disabled={!isUnlocked || expired}
        onClick={handleClick}
        className={cn((!isUnlocked || expired) && 'text-muted-foreground opacity-70', className)}
        {...rest}
      >
        {(!isUnlocked || expired) && <Lock className="mr-2 h-4 w-4" />}
        {children}
      </Button>
      <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} feature={feature} />
      <ExpiredModal open={expiredOpen} onOpenChange={setExpiredOpen} />
    </>
  );
}
