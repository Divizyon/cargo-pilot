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
    margin: 'auto',
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
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
              <Text style={[styles.tableCell, { flex: 2 }]}>Ürün Adı</Text>
              <Text style={styles.tableCell}>Konum X</Text>
              <Text style={styles.tableCell}>Konum Y</Text>
              <Text style={styles.tableCell}>Konum Z</Text>
              <Text style={[styles.tableCell, { flex: 1.5 }]}>Boyutlar</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>Durum</Text>
            </View>
            {placements.map((placement, idx) => {
              const item = items.find((i) => i.id === placement.itemId);
              return (
                <View key={idx} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { flex: 2 }]}>{item?.name ?? '-'}</Text>
                  <Text style={styles.tableCell}>{placement.positionX}</Text>
                  <Text style={styles.tableCell}>{placement.positionY}</Text>
                  <Text style={styles.tableCell}>{placement.positionZ}</Text>
                  <Text style={[styles.tableCell, { flex: 1.5 }]}>
                    {placement.width}×{placement.height}×{placement.depth}
                  </Text>
                  <Text
                    style={[
                      styles.tableCell,
                      { flex: 1 },
                      ...(placement.isViolation ? [styles.violationCell] : []),
                    ]}
                  >
                    {placement.isViolation ? 'İhlal' : 'Uygun'}
                  </Text>
                </View>
              );
            })}
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
