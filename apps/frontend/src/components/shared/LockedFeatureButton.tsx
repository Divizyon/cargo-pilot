import { useState } from 'react';
import { Lock } from 'lucide-react';
import { Button, type ButtonProps } from '@/components/ui/button';
import { useSubscriptionStore } from '@/lib/store/useSubscriptionStore';
import { hasFeatureAccess } from '@/lib/utils/checkFeatureAccess';
import type { FeatureKey } from '@/lib/config/plan-features';
import { UpgradeModal } from '@/features/platform/components/UpgradeModal';
import { cn } from '@/lib/utils';

interface LockedFeatureButtonProps extends Omit<ButtonProps, 'onClick'> {
  feature: FeatureKey;
  onClick?: () => void;
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
  const [modalOpen, setModalOpen] = useState(false);
  const isUnlocked = hasFeatureAccess(plan, feature);

  const handleClick = () => {
    if (isUnlocked) {
      onClick?.();
    } else {
      setModalOpen(true);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant={isUnlocked ? variant : 'outline'}
        disabled={disabled}
        aria-disabled={!isUnlocked}
        onClick={handleClick}
        className={cn(!isUnlocked && 'text-muted-foreground opacity-70', className)}
        {...rest}
      >
        {!isUnlocked && <Lock className="mr-2 h-4 w-4" />}
        {children}
      </Button>
      <UpgradeModal open={modalOpen} onOpenChange={setModalOpen} feature={feature} />
    </>
  );
}
