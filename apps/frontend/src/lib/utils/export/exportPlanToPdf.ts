import type { ComponentType } from 'react';
import type { PlacementWithDimensions } from '@/lib/types/loadingPlan';
import type { Item } from '@/lib/types/item';
import type { Vehicle } from '@/lib/types/vehicle';
import { useReportingSettingsStore } from '@/lib/store/useReportingSettingsStore';
import type { PlanPdfDocumentProps } from '@/features/planning/export/components/PlanPdfDocument';

export interface PdfExportData {
  planId: string;
  placements: PlacementWithDimensions[];
  items: Item[];
  vehicle: Vehicle | null;
  snapshotDataUrl?: string;
}

export async function exportPlanToPdf(data: PdfExportData): Promise<void> {
  const store = useReportingSettingsStore.getState();
  const documentNumber = store.nextDocumentNumber();
  const generatedAt = new Date();

  const [{ pdf }, { PlanPdfDocument }] = await Promise.all([
    import('@react-pdf/renderer'),
    import('@/features/planning/export/components/PlanPdfDocument'),
  ]);

  const React = (await import('react')).default;

  const props: PlanPdfDocumentProps = {
    planId: data.planId,
    placements: data.placements,
    items: data.items,
    vehicle: data.vehicle,
    snapshotDataUrl: data.snapshotDataUrl,
    documentNumber,
    generatedAt,
    reportingSettings: {
      logoDataUrl: store.logoDataUrl,
      companyName: store.companyName,
      phone: store.phone,
      email: store.email,
      address: store.address,
      dateFormat: store.dateFormat,
      showSignatureArea: store.showSignatureArea,
    },
  };

  // @react-pdf/renderer pdf() expects React.ReactElement; cast required for type compat
  const element = React.createElement(
    PlanPdfDocument as ComponentType<PlanPdfDocumentProps>,
    props,
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blob = await pdf(element as any).toBlob();

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${documentNumber}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
