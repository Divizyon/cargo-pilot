import { useNavigate } from 'react-router-dom';
import { Truck, Package, Zap, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/lib/config/routes';
import { WizardStepper, type WizardStep } from './WizardStepper';

const STEPS: WizardStep[] = [
  { step: 1, label: 'Araç Ekle', icon: Truck },
  { step: 2, label: 'Ürün Ekle', icon: Package },
  { step: 3, label: 'Optimize Et', icon: Zap },
];

export function DashboardPlanWizard() {
  const navigate = useNavigate();

  return (
    <div className="w-fit">
      <div className="flex items-center gap-3 mb-4">
        <p className="text-base font-semibold text-foreground">Yeni Plan Oluştur</p>
        <Button size="sm" onClick={() => navigate(ROUTES.PLANNING_NEW)}>
          Başlat
          <ArrowRight size={15} className="ml-1.5" />
        </Button>
      </div>
      <WizardStepper steps={STEPS} onStepClick={() => navigate(ROUTES.PLANNING_NEW)} />
    </div>
  );
}
