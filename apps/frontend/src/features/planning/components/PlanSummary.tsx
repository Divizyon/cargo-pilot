'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { LoadingPlan } from '@/lib/types/loadingPlan';
import { usePlanStore } from '@/lib/store/usePlanStore';
import { exportPlanToExcel } from '@/lib/utils/export-utils';
import { exportPlanToPdf } from '@/lib/utils/exportPlanToPdf';
import { checkFeatureAccess } from '@/lib/utils/checkFeatureAccess';

interface PlanSummaryProps {
  plan: LoadingPlan;
  getSnapshot?: () => string;
}

export function PlanSummary({ plan, getSnapshot }: PlanSummaryProps) {
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [isExcelLoading, setIsExcelLoading] = useState(false);
  const placements = usePlanStore((s) => s.placements);
  const selectedItems = usePlanStore((s) => s.selectedItems);
  const selectedVehicle = usePlanStore((s) => s.selectedVehicle);

  const canExcelExport = checkFeatureAccess('excelExport');
  const canPdfExport = checkFeatureAccess('pdfExport');
  const isLoading = isPdfLoading || isExcelLoading;

  const items = selectedItems.map((si) => si.item);

  const handleExcelExport = () => {
    try {
      setIsExcelLoading(true);
      exportPlanToExcel(plan.id, placements, items);
    } finally {
      setIsExcelLoading(false);
    }
  };

  const handlePdfExport = async () => {
    try {
      setIsPdfLoading(true);
      const snapshotDataUrl = getSnapshot?.();
      await exportPlanToPdf({
        planId: plan.id,
        placements,
        items,
        vehicle: selectedVehicle,
        snapshotDataUrl,
      });
    } finally {
      setIsPdfLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">Plan ID</p>
        <p className="font-mono text-sm">{plan.id}</p>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">
          Yerleştirme Sayısı
        </p>
        <p className="text-lg font-semibold">{placements.length}</p>
      </div>

      <div className="space-y-2 pt-4 border-t">
        <p className="text-sm font-medium">Rapor İndir</p>
        <div className="flex flex-col gap-2">
          <Button
            onClick={handleExcelExport}
            disabled={isLoading || !canExcelExport}
            variant="outline"
            className={cn('w-full justify-start')}
          >
            {isExcelLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Excel İndir
          </Button>

          <Button
            onClick={handlePdfExport}
            disabled={isLoading || !canPdfExport}
            variant="outline"
            className={cn('w-full justify-start')}
          >
            {isPdfLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            PDF İndir
          </Button>
        </div>
      </div>
    </div>
  );
}
