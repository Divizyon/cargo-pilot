import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Item } from '@/lib/types/item';
import type { LoadingPlan, PlacementWithDimensions } from '@/lib/types/loadingPlan';
import type { Vehicle } from '@/lib/types/vehicle';
import {
  buildPlanSummary,
  captureSceneSnapshot,
  exportPlanToExcel,
} from '@/lib/utils/export-utils';

interface PlanExportButtonsProps {
  plan: LoadingPlan;
  placements: PlacementWithDimensions[];
  items: Item[];
  vehicle: Vehicle;
}

export function PlanExportButtons({ plan, placements, items, vehicle }: PlanExportButtonsProps) {
  const { t } = useTranslation();
  const [isExcelLoading, setIsExcelLoading] = useState(false);
  const [isPdfLoading, setIsPdfLoading] = useState(false);

  const handleExcel = () => {
    setIsExcelLoading(true);
    try {
      exportPlanToExcel(plan, placements, items);
    } finally {
      setIsExcelLoading(false);
    }
  };

  const handlePdf = async () => {
    setIsPdfLoading(true);
    try {
      const [{ pdf }, { PlanPdfReport }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('./PlanPdfReport'),
      ]);
      const vehicleVolume = vehicle.width * vehicle.height * vehicle.length;
      const summary = buildPlanSummary(placements, items, vehicleVolume);
      const snapshot = captureSceneSnapshot();
      const blob = await pdf(
        <PlanPdfReport
          plan={plan}
          placements={placements}
          items={items}
          summary={summary}
          snapshot={snapshot}
        />,
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `cargo-pilot-plan-${plan.id.slice(0, 8)}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsPdfLoading(false);
    }
  };

  const anyLoading = isExcelLoading || isPdfLoading;

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant="outline"
        onClick={handleExcel}
        disabled={anyLoading || placements.length === 0}
      >
        {isExcelLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <FileDown className="mr-2 h-4 w-4" />
        )}
        {isExcelLoading ? t('export.loadingExcel') : t('export.excel')}
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={() => void handlePdf()}
        disabled={anyLoading || placements.length === 0}
      >
        {isPdfLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <FileDown className="mr-2 h-4 w-4" />
        )}
        {isPdfLoading ? t('export.loadingPdf') : t('export.pdf')}
      </Button>
    </div>
  );
}
