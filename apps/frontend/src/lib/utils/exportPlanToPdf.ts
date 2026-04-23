import type { PlacementWithDimensions } from '@/lib/types/loadingPlan';
import type { Item } from '@/lib/types/item';
import type { Vehicle } from '@/lib/types/vehicle';

export interface PdfExportData {
  planId: string;
  placements: PlacementWithDimensions[];
  items: Item[];
  vehicle: Vehicle | null;
  snapshotDataUrl?: string;
}

export async function exportPlanToPdf(data: PdfExportData): Promise<void> {
  const [{ pdf }, { PlanPdfDocument }] = await Promise.all([
    import('@react-pdf/renderer'),
    import('@/features/planning/components/PlanPdfDocument'),
  ]);

  const React = (await import('react')).default;
  // @react-pdf/renderer pdf() fonksiyonu React.ReactElement bekler; tip uyumu için cast gerekli
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const element = React.createElement(PlanPdfDocument as React.ComponentType<any>, data);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blob = await pdf(element as any).toBlob();

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `CargoPilot_Plan_${data.planId.slice(0, 8)}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
