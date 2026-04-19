import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { Item } from '@/lib/types/item';
import type { LoadingPlan, PlacementWithDimensions } from '@/lib/types/loadingPlan';
import type { PlanSummary } from '@/lib/utils/export-utils';

interface PlanPdfReportProps {
  plan: LoadingPlan;
  placements: PlacementWithDimensions[];
  items: Item[];
  summary: PlanSummary;
  snapshot?: string | null;
}

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: 'Helvetica' },
  heading: { fontSize: 18, marginBottom: 4, fontFamily: 'Helvetica-Bold' },
  subheading: { fontSize: 10, color: '#4b5563', marginBottom: 16 },
  sectionTitle: {
    fontSize: 12,
    marginTop: 16,
    marginBottom: 6,
    fontFamily: 'Helvetica-Bold',
  },
  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  summaryCard: {
    flex: 1,
    padding: 8,
    border: 1,
    borderColor: '#e5e7eb',
    borderRadius: 4,
  },
  summaryLabel: { color: '#6b7280', marginBottom: 2 },
  summaryValue: { fontSize: 13, fontFamily: 'Helvetica-Bold' },
  snapshot: { width: '100%', height: 200, objectFit: 'contain', marginBottom: 12 },
  snapshotMissing: { color: '#9ca3af', fontStyle: 'italic', marginBottom: 12 },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    paddingVertical: 4,
    paddingHorizontal: 4,
    fontFamily: 'Helvetica-Bold',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: 1,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  cellName: { flex: 2 },
  cellSku: { flex: 1 },
  cellDim: { flex: 1 },
  cellPos: { flex: 2 },
  cellViolation: { flex: 1 },
  violationError: { color: '#b91c1c' },
});

const UNKNOWN = '-';

export function PlanPdfReport({ plan, placements, items, summary, snapshot }: PlanPdfReportProps) {
  const itemIndex = new Map(items.map((i) => [i.id, i]));

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.heading}>Yükleme Planı Raporu</Text>
        <Text style={styles.subheading}>
          Plan: {plan.id.slice(0, 8)} · {new Date(plan.createdAt).toLocaleString('tr-TR')}
        </Text>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Doluluk Oranı</Text>
            <Text style={styles.summaryValue}>%{summary.fillRatePercent}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Toplam Ağırlık</Text>
            <Text style={styles.summaryValue}>{summary.totalWeightKg} kg</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Öğe Sayısı</Text>
            <Text style={styles.summaryValue}>{summary.totalItemCount}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>İhlal</Text>
            <Text style={styles.summaryValue}>{summary.violationCount}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>3D Sahne</Text>
        {snapshot ? (
          <Image src={snapshot} style={styles.snapshot} />
        ) : (
          <Text style={styles.snapshotMissing}>Sahne görüntüsü alınamadı</Text>
        )}

        <Text style={styles.sectionTitle}>Yük Listesi</Text>
        <View style={styles.tableHeader}>
          <Text style={styles.cellName}>Ürün</Text>
          <Text style={styles.cellSku}>SKU</Text>
          <Text style={styles.cellDim}>G×Y×U</Text>
          <Text style={styles.cellPos}>Konum (X,Y,Z)</Text>
          <Text style={styles.cellViolation}>Durum</Text>
        </View>
        {placements.map((p, i) => {
          const item = itemIndex.get(p.itemId);
          return (
            <View key={`${p.itemId}-${i}`} style={styles.tableRow}>
              <Text style={styles.cellName}>{item?.name ?? UNKNOWN}</Text>
              <Text style={styles.cellSku}>{item?.sku ?? UNKNOWN}</Text>
              <Text style={styles.cellDim}>
                {p.width}×{p.height}×{p.depth}
              </Text>
              <Text style={styles.cellPos}>
                {p.positionX}, {p.positionY}, {p.positionZ}
              </Text>
              <Text
                style={
                  p.isViolation
                    ? [styles.cellViolation, styles.violationError]
                    : styles.cellViolation
                }
              >
                {p.isViolation ? 'İhlal' : 'Uygun'}
              </Text>
            </View>
          );
        })}
      </Page>
    </Document>
  );
}
