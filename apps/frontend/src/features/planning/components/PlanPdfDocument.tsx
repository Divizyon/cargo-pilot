import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import type { PlacementWithDimensions } from '@/lib/types/loadingPlan';
import type { Item } from '@/lib/types/item';
import type { Vehicle } from '@/lib/types/vehicle';
import type { DateFormat } from '@/lib/store/useReportingSettingsStore';
import { formatDate, formatTimestamp } from '@/lib/utils/pdfDateUtils';

// ─── Font sanitizer ───────────────────────────────────────────────────────────
// Helvetica (built-in PDF font) uses Latin-1 encoding. Turkish chars ı (U+0131),
// İ (U+0130), ğ (U+011F), Ğ (U+011E), ş (U+015F), Ş (U+015E) are outside
// Latin-1 and render as garbage. Replace with nearest ASCII equivalents.
function s(text: string): string {
  return text
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'I')
    .replace(/ğ/g, 'g')
    .replace(/Ğ/g, 'G')
    .replace(/ş/g, 's')
    .replace(/Ş/g, 'S');
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FOOTER_COLOR = '#9ca3af'; // tertiary text
const MUTED_COLOR = '#6b7280';
const PRIMARY_COLOR = '#1f2937';
const BORDER_COLOR = '#e5e7eb';

// Header height ≈ 55pt  →  paddingTop must be ≥ header bottom + gap
const PAGE_PADDING_TOP = 90;
const PAGE_PADDING_BOTTOM = 50;
const PAGE_PADDING_H = 40;

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  page: {
    paddingTop: PAGE_PADDING_TOP,
    paddingBottom: PAGE_PADDING_BOTTOM,
    paddingLeft: PAGE_PADDING_H,
    paddingRight: PAGE_PADDING_H,
    fontFamily: 'Helvetica',
    fontSize: 10,
  },

  // Fixed header ─ absolute, repeats every page
  header: {
    position: 'absolute',
    top: 20,
    left: PAGE_PADDING_H,
    right: PAGE_PADDING_H,
  },
  headerInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    flex: 1,
  },
  headerLogo: {
    width: 48,
    height: 22,
    objectFit: 'contain',
  },
  headerLogoText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: PRIMARY_COLOR,
  },
  headerCompanyBlock: {
    flexDirection: 'column',
  },
  headerCompanyName: {
    fontSize: 9,
    fontWeight: 'bold',
    color: PRIMARY_COLOR,
    marginBottom: 1,
  },
  headerCompanyDetail: {
    fontSize: 7,
    color: MUTED_COLOR,
    marginBottom: 1,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  headerDocNumber: {
    fontSize: 9,
    fontWeight: 'bold',
    color: PRIMARY_COLOR,
    marginBottom: 2,
  },
  headerDate: {
    fontSize: 8,
    color: MUTED_COLOR,
  },
  headerDivider: {
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
    marginTop: 8,
  },

  // Fixed footer ─ absolute, repeats every page
  footer: {
    position: 'absolute',
    bottom: 15,
    left: PAGE_PADDING_H,
    right: PAGE_PADDING_H,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 8,
    color: FOOTER_COLOR,
  },

  // Content
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: PRIMARY_COLOR,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#374151',
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
    paddingBottom: 4,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  summaryBox: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    padding: 10,
    borderRadius: 4,
  },
  summaryLabel: {
    fontSize: 8,
    color: MUTED_COLOR,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: PRIMARY_COLOR,
  },
  table: {
    width: '100%',
    borderStyle: 'solid' as const,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    marginBottom: 16,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
    width: '100%',
  },
  tableHeader: {
    backgroundColor: '#f3f4f6',
    fontWeight: 'bold',
  },
  tableCell: {
    flex: 1,
    padding: 7,
    fontSize: 8,
  },
  violationCell: {
    color: '#dc2626',
    fontWeight: 'bold',
  },
  snapshotContainer: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    padding: 8,
  },

  // Signature area ─ two columns: Hazirlayan + Onaylayan
  signatureRow: {
    marginTop: 32,
    flexDirection: 'row',
    gap: 24,
  },
  signatureBox: {
    flex: 1,
    paddingTop: 8,
  },
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
    marginBottom: 8,
    height: 28,
  },
  signatureLabel: {
    fontSize: 9,
    color: MUTED_COLOR,
    textAlign: 'center',
  },
});

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ReportingPdfSettings {
  logoDataUrl: string | null;
  companyName: string;
  phone: string;
  email: string;
  address: string;
  dateFormat: DateFormat;
  showSignatureArea: boolean;
}

export interface PlanPdfDocumentProps {
  planId: string;
  placements: PlacementWithDimensions[];
  items: Item[];
  vehicle: Vehicle | null;
  snapshotDataUrl?: string;
  documentNumber: string;
  generatedAt: Date;
  reportingSettings: ReportingPdfSettings;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PdfHeader({
  documentNumber,
  generatedAt,
  settings,
}: {
  documentNumber: string;
  generatedAt: Date;
  settings: ReportingPdfSettings;
}) {
  const hasContact = settings.companyName || settings.phone || settings.email || settings.address;
  const formattedDate = formatDate(generatedAt, settings.dateFormat);

  return (
    <View fixed style={styles.header}>
      <View style={styles.headerInner}>
        {/* Left: logo + company info */}
        <View style={styles.headerLeft}>
          {settings.logoDataUrl ? (
            <Image src={settings.logoDataUrl} style={styles.headerLogo} />
          ) : (
            <Text style={styles.headerLogoText}>CargoPilot</Text>
          )}
          {hasContact && (
            <View style={styles.headerCompanyBlock}>
              {settings.companyName ? (
                <Text style={styles.headerCompanyName}>{s(settings.companyName)}</Text>
              ) : null}
              {settings.phone ? (
                <Text style={styles.headerCompanyDetail}>{settings.phone}</Text>
              ) : null}
              {settings.email ? (
                <Text style={styles.headerCompanyDetail}>{settings.email}</Text>
              ) : null}
              {settings.address ? (
                <Text style={styles.headerCompanyDetail}>{s(settings.address)}</Text>
              ) : null}
            </View>
          )}
        </View>

        {/* Right: doc number + date */}
        <View style={styles.headerRight}>
          <Text style={styles.headerDocNumber}>{documentNumber}</Text>
          <Text style={styles.headerDate}>{formattedDate}</Text>
        </View>
      </View>
      <View style={styles.headerDivider} />
    </View>
  );
}

function PdfFooter({ generatedAt, dateFormat }: { generatedAt: Date; dateFormat: DateFormat }) {
  const timestamp = formatTimestamp(generatedAt, dateFormat);

  return (
    <View fixed style={styles.footer}>
      <Text style={styles.footerText}>Sistem Üretim Tarihi: {timestamp}</Text>
      <Text
        style={styles.footerText}
        render={({ pageNumber, totalPages }) => `Sayfa ${pageNumber} / ${totalPages}`}
      />
    </View>
  );
}

function SignatureSection() {
  return (
    <View style={styles.signatureRow}>
      <View style={styles.signatureBox}>
        <View style={styles.signatureLine} />
        <Text style={styles.signatureLabel}>Hazirlayan</Text>
      </View>
      <View style={styles.signatureBox}>
        <View style={styles.signatureLine} />
        <Text style={styles.signatureLabel}>Onaylayan</Text>
      </View>
    </View>
  );
}

// ─── Document ─────────────────────────────────────────────────────────────────

export function PlanPdfDocument({
  planId,
  placements,
  items,
  vehicle,
  snapshotDataUrl,
  documentNumber,
  generatedAt,
  reportingSettings,
}: PlanPdfDocumentProps) {
  const fillRate = (() => {
    if (!vehicle) return 0;
    const vehicleVolume = vehicle.width * vehicle.height * vehicle.length;
    const placedVolume = placements.reduce((sum, p) => sum + p.width * p.height * p.depth, 0);
    return vehicleVolume > 0 ? (placedVolume / vehicleVolume) * 100 : 0;
  })();

  const totalWeight = placements.reduce((sum, p) => {
    const item = items.find((i) => i.id === p.itemId);
    return sum + (item?.weight ?? 0);
  }, 0);

  const grouped = placements.reduce<
    Map<string, { name: string; count: number; weight: number; violations: number; dims: string }>
  >((acc, p) => {
    const item = items.find((i) => i.id === p.itemId);
    const existing = acc.get(p.itemId);
    if (existing) {
      existing.count += 1;
      existing.weight += item?.weight ?? 0;
      if (p.isViolation) existing.violations += 1;
    } else {
      acc.set(p.itemId, {
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
        {/* Fixed header — every page */}
        <PdfHeader
          documentNumber={documentNumber}
          generatedAt={generatedAt}
          settings={reportingSettings}
        />

        {/* Fixed footer — every page */}
        <PdfFooter generatedAt={generatedAt} dateFormat={reportingSettings.dateFormat} />

        {/* ── Content ── */}
        <Text style={styles.title}>Yukleme Plani Raporu</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Plan Ozeti</Text>
          <Text style={{ marginBottom: 8, fontSize: 8, color: MUTED_COLOR }}>
            Plan ID: {planId}
          </Text>

          <View style={styles.summaryGrid}>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>Doluluk Orani</Text>
              <Text style={styles.summaryValue}>{fillRate.toFixed(1)}%</Text>
            </View>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>Toplam Agirlik</Text>
              <Text style={styles.summaryValue}>{totalWeight.toFixed(1)} kg</Text>
            </View>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>Yuklenen Urun Sayisi</Text>
              <Text style={styles.summaryValue}>{placements.length}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Yukleme Listesi</Text>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={[styles.tableCell, { width: '34%' }]}>Urun Adi</Text>
              <Text style={[styles.tableCell, { width: '12%', textAlign: 'center' }]}>Adet</Text>
              <Text style={[styles.tableCell, { width: '24%' }]}>Boyutlar (cm)</Text>
              <Text style={[styles.tableCell, { width: '18%', textAlign: 'right' }]}>
                Agirlik (kg)
              </Text>
              <Text style={[styles.tableCell, { width: '12%', textAlign: 'center' }]}>Ihlal</Text>
            </View>
            {groupedRows.map((row, idx) => (
              <View
                key={idx}
                style={[
                  styles.tableRow,
                  { backgroundColor: idx % 2 === 1 ? '#f9fafb' : '#ffffff' },
                ]}
              >
                <Text style={[styles.tableCell, { width: '34%' }]}>{s(row.name)}</Text>
                <Text
                  style={[
                    styles.tableCell,
                    { width: '12%', textAlign: 'center', fontWeight: 'bold' },
                  ]}
                >
                  {row.count}
                </Text>
                <Text style={[styles.tableCell, { width: '24%', color: MUTED_COLOR }]}>
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
                style={{ width: '100%', height: 260, objectFit: 'contain' }}
              />
            </View>
          </View>
        )}

        {/* Signature — last page only, conditional */}
        {reportingSettings.showSignatureArea && <SignatureSection />}
      </Page>
    </Document>
  );
}
