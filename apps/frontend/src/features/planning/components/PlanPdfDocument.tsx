import { Document, Page, View, Text, Image, StyleSheet, Font } from '@react-pdf/renderer';
import type { PlacementWithDimensions } from '@/lib/types/loadingPlan';
import type { Item } from '@/lib/types/item';
import type { Vehicle } from '@/lib/types/vehicle';

Font.register({
  family: 'Roboto',
  src: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/fonts/FontAwesome.otf',
});

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#1f2937',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#374151',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 5,
  },
  summaryGrid: {
    display: 'flex',
    flexDirection: 'row',
    gap: 20,
    marginBottom: 15,
  },
  summaryBox: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    padding: 10,
    borderRadius: 4,
  },
  summaryLabel: {
    fontSize: 9,
    color: '#6b7280',
    marginBottom: 5,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  table: {
    width: '100%',
    borderStyle: 'solid' as const,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 20,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    width: '100%',
  },
  tableHeader: {
    backgroundColor: '#f3f4f6',
    fontWeight: 'bold',
  },
  tableCell: {
    flex: 1,
    padding: 8,
    fontSize: 9,
  },
  violationCell: {
    color: '#dc2626',
    fontWeight: 'bold',
  },
  snapshotContainer: {
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 10,
  },
});

interface PlanPdfDocumentProps {
  planId: string;
  placements: PlacementWithDimensions[];
  items: Item[];
  vehicle: Vehicle | null;
  snapshotDataUrl?: string;
}

export function PlanPdfDocument({
  planId,
  placements,
  items,
  vehicle,
  snapshotDataUrl,
}: PlanPdfDocumentProps) {
  const calculateFillRate = (): number => {
    if (!vehicle) return 0;
    const vehicleVolume = vehicle.width * vehicle.height * vehicle.length;
    const placedVolume = placements.reduce((sum, p) => sum + p.width * p.height * p.depth, 0);
    return vehicleVolume > 0 ? (placedVolume / vehicleVolume) * 100 : 0;
  };

  const calculateTotalWeight = (): number => {
    return placements.reduce((sum, placement) => {
      const item = items.find((i) => i.id === placement.itemId);
      return sum + (item?.weight ?? 0);
    }, 0);
  };

  const fillRate = calculateFillRate();
  const totalWeight = calculateTotalWeight();

  // Aynı ürünleri grupla
  const grouped = placements.reduce<
    Map<string, { name: string; count: number; weight: number; violations: number; dims: string }>
  >((acc, p) => {
    const item = items.find((i) => i.id === p.itemId);
    const key = p.itemId;
    const existing = acc.get(key);
    if (existing) {
      existing.count += 1;
      existing.weight += item?.weight ?? 0;
      if (p.isViolation) existing.violations += 1;
    } else {
      acc.set(key, {
        name: item?.name ?? '-',
        count: 1,
        weight: item?.weight ?? 0,
        violations: p.isViolation ? 1 : 0,
        dims: `${p.width}×${p.height}×${p.depth}`,
      });
    }
    return acc;
  }, new Map());

  const groupedRows = Array.from(grouped.values());

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Yükleme Planı Raporu</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Plan Özeti</Text>
          <Text style={{ marginBottom: 10, fontSize: 9, color: '#6b7280' }}>Plan ID: {planId}</Text>

          <View style={styles.summaryGrid}>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>Doluluk Oranı</Text>
              <Text style={styles.summaryValue}>{fillRate.toFixed(1)}%</Text>
            </View>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>Toplam Ağırlık</Text>
              <Text style={styles.summaryValue}>{totalWeight.toFixed(1)} kg</Text>
            </View>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>Yüklenen Ürün Sayısı</Text>
              <Text style={styles.summaryValue}>{placements.length}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Yükleme Listesi</Text>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={[styles.tableCell, { width: '34%' }]}>Ürün Adı</Text>
              <Text style={[styles.tableCell, { width: '12%', textAlign: 'center' }]}>Adet</Text>
              <Text style={[styles.tableCell, { width: '24%' }]}>Boyutlar (cm)</Text>
              <Text style={[styles.tableCell, { width: '18%', textAlign: 'right' }]}>
                Ağırlık (kg)
              </Text>
              <Text style={[styles.tableCell, { width: '12%', textAlign: 'center' }]}>İhlal</Text>
            </View>
            {groupedRows.map((row, idx) => (
              <View
                key={idx}
                style={[
                  styles.tableRow,
                  { backgroundColor: idx % 2 === 1 ? '#f9fafb' : '#ffffff' },
                ]}
              >
                <Text style={[styles.tableCell, { width: '34%' }]}>{row.name}</Text>
                <Text
                  style={[
                    styles.tableCell,
                    { width: '12%', textAlign: 'center', fontWeight: 'bold' },
                  ]}
                >
                  {row.count}
                </Text>
                <Text style={[styles.tableCell, { width: '24%', color: '#6b7280' }]}>
                  {row.dims}
                </Text>
                <Text style={[styles.tableCell, { width: '18%', textAlign: 'right' }]}>
                  {(row.weight * row.count).toFixed(1)}
                </Text>
                <Text
                  style={[
                    styles.tableCell,
                    { width: '12%', textAlign: 'center' },
                    row.violations > 0 ? styles.violationCell : { color: '#16a34a' },
                  ]}
                >
                  {row.violations > 0 ? row.violations : '—'}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {snapshotDataUrl && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3D Sahne Görünümü</Text>
            <View style={styles.snapshotContainer}>
              <Image
                src={snapshotDataUrl}
                style={{
                  width: '100%',
                  height: 300,
                  objectFit: 'contain',
                }}
              />
            </View>
          </View>
        )}
      </Page>
    </Document>
  );
}
