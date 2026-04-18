import type { LoadingPlan } from '@/lib/types/loadingPlan';

interface PlanSummaryProps {
  plan: LoadingPlan;
}

export function PlanSummary({ plan }: PlanSummaryProps) {
  return (
    <div>
      <span>Plan ID: {plan.id}</span>
      <span>Yerleştirme Sayısı: {plan.placementDetails.length}</span>
    </div>
  );
}
