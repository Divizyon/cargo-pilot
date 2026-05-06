import { type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileDown, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { downloadPlanPdf } from '@/lib/utils/downloadPlanPdf';
import { useUIStore } from '@/lib/store/useUIStore';
import { useUnitStore } from '@/lib/store/useUnitStore';
import { formatDate } from '@/lib/utils/formatDate';
import { ROUTES } from '@/lib/config/routes';
import type { RecentPlan } from '@/lib/api/useRecentPlans';

interface Props {
  plan: RecentPlan;
  isSelected: boolean;
}

export function RecentPlanRow({ plan, isSelected }: Props) {
  const navigate = useNavigate();
  const setSelectedSnapshotPlanId = useUIStore((s) => s.setSelectedSnapshotPlanId);
  const dateFormat = useUnitStore((s) => s.dateFormat);

  function handleSelect() {
    setSelectedSnapshotPlanId(plan.id);
  }

  function handleReportDetail(e: MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    setSelectedSnapshotPlanId(plan.id);
    navigate(`${ROUTES.REPORTS}?planId=${plan.id}`);
  }

  function handleDownload(e: MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    downloadPlanPdf(plan.id);
  }

  return (
    <li
      onClick={handleSelect}
      className="flex items-center justify-between py-3 border-b last:border-b-0 px-6 cursor-pointer hover:bg-muted/40 transition-colors"
      style={{ background: isSelected ? 'hsl(var(--muted) / 0.4)' : undefined }}
    >
      <div className="min-w-0 flex-1">
        <button
          onClick={handleSelect}
          className="text-sm font-medium text-foreground hover:underline underline-offset-2 cursor-pointer text-left truncate block max-w-[240px]"
        >
          {plan.name}
        </button>
        <p className="text-xs text-muted-foreground mt-0.5">
          {formatDate(plan.createdAt, dateFormat, true)}
        </p>
      </div>

      <div className="flex items-center gap-0.5 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          title="PDF Raporu İndir"
          onClick={handleDownload}
        >
          <FileDown className="size-4 text-muted-foreground" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          title="Rapor Detayını Gör"
          onClick={handleReportDetail}
        >
          <ExternalLink className="size-4 text-muted-foreground" />
        </Button>
      </div>
    </li>
  );
}
