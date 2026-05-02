import { useNavigate } from 'react-router-dom';
import { Truck, Package, Zap, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';

const STEPS = [
  { number: 1, label: 'Araç Ekle', icon: Truck },
  { number: 2, label: 'Ürün Ekle', icon: Package },
  { number: 3, label: 'Optimize Et', icon: Zap },
] as const;

export function PlanWizardStepper() {
  const navigate = useNavigate();

  return (
    <div className="rounded-xl border border-[var(--border)] bg-white p-5">
      <div className="flex items-center justify-between mb-5">
        <p className="text-base font-semibold">Yeni Plan Oluştur</p>
        <Button size="sm" onClick={() => navigate('/planning/new')}>
          Başlat
          <ArrowRight size={15} className="ml-1.5" />
        </Button>
      </div>

      <div className="flex items-center gap-0">
        {STEPS.map((step, idx) => {
          const Icon = step.icon;
          const isLast = idx === STEPS.length - 1;

          return (
            <div key={step.number} className="flex items-center flex-1">
              <div className="flex flex-col items-center gap-2 flex-1">
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center',
                    'bg-[var(--primary)] text-white',
                  )}
                >
                  <Icon size={18} />
                </div>
                <div className="text-center">
                  <span className="text-xs text-muted-foreground block leading-none mb-0.5">
                    {step.number}. Adım
                  </span>
                  <span className="text-sm font-medium">{step.label}</span>
                </div>
              </div>

              {!isLast && (
                <div className="h-px flex-1 bg-[var(--border)] mx-2 mt-[-18px]" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
