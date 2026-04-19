import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { getRequiredPlan } from '@/lib/utils/checkFeatureAccess';
import type { FeatureKey } from '@/lib/config/plan-features';

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature: FeatureKey;
}

export function UpgradeModal({ open, onOpenChange, feature }: UpgradeModalProps) {
  const { t } = useTranslation();
  const requiredPlan = getRequiredPlan(feature);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="text-primary" />
          </div>
          <DialogTitle>{t('upgrade.title')}</DialogTitle>
          <DialogDescription>
            {t('upgrade.description', {
              feature: t(`features.${feature}`),
              plan: t(`plans.${requiredPlan}`),
            })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('upgrade.dismiss')}
          </Button>
          <Button type="button">{t('upgrade.viewPlans')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
