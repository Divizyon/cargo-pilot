import type { ReactNode } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileDown, FileSpreadsheet, ImageOff, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useReportDetail, useDownloadPlanPdf, useDownloadReportExcel } from '@/lib/api/useReports';
import type { PlanProductGroup } from '@/lib/types/loadingPlan';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_MAP: Record<
  number,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  0: { label: 'Taslak', variant: 'secondary' },
  1: { label: 'Aktif', variant: 'default' },
  2: { label: 'Tamamlandı', variant: 'outline' },
  3: { label: 'İptal', variant: 'destructive' },
};

const CONSTRAINT_LABELS: Record<string, string> = {
  fragile: 'Kırılgan',
  liquid: 'Sıvı',
  hazmat: 'Tehlikeli',
  no_rotate: 'Döndürülmez',
  bottom_only: 'Sadece Alt',
  heavy_side: 'Ağır Yan',
};

const dateFormatter = new Intl.DateTimeFormat('tr-TR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

function formatDate(dateStr: string): string {
  try {
    return dateFormatter.format(new Date(dateStr));
  } catch {
    return '—';
  }
}

function fillRateColor(rate: number) {
  if (rate >= 90) return 'text-emerald-600';
  if (rate >= 60) return 'text-amber-500';
  return 'text-red-500';
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-3 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-7 w-20" />
              <Skeleton className="mt-2 h-1.5 w-full rounded-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-2xl" />
      <Skeleton className="h-48 w-full rounded-2xl" />
    </div>
  );
}

// ─── Metric card ──────────────────────────────────────────────────────────────

interface MetricCardProps {
  title: string;
  value: ReactNode;
  sub?: string;
  progress?: number;
}

function MetricCard({ title, value, sub, progress }: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-2xl font-bold text-foreground">{value}</p>
        {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
        {progress !== undefined && (
          <Progress
            value={progress}
            className={cn(
              'mt-3 h-1.5',
              progress >= 90
                ? '[&>div]:bg-emerald-500'
                : progress >= 60
                  ? '[&>div]:bg-amber-500'
                  : '[&>div]:bg-red-500',
            )}
          />
        )}
      </CardContent>
    </Card>
  );
}

// ─── Product table ────────────────────────────────────────────────────────────

function ProductTable({ groups }: { groups: PlanProductGroup[] }) {
  if (groups.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">Ürün verisi bulunamadı.</p>
    );
  }

  return (
    <Table className="min-w-[640px] table-fixed">
      <TableHeader>
        <TableRow className="h-9 bg-muted/40 hover:bg-muted/40">
          {['Ürün Adı', 'Grup', 'Adet', 'Birim Ağırlık', 'Toplam Ağırlık', 'Kısıtlamalar'].map(
            (h) => (
              <TableHead
                key={h}
                className="whitespace-nowrap px-3 py-0 text-[10px] font-semibold uppercase tracking-widest"
              >
                {h}
              </TableHead>
            ),
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {groups.flatMap((g) =>
          g.products.map((p) => (
            <TableRow key={`${g.id}-${p.id}`} className="h-11">
              <TableCell className="px-3 py-0">
                <span className="flex items-center gap-2 text-xs font-medium text-foreground">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: g.color }}
                  />
                  {p.name}
                </span>
              </TableCell>
              <TableCell className="px-3 py-0">
                <span className="text-xs text-muted-foreground">{g.name}</span>
              </TableCell>
              <TableCell className="px-3 py-0">
                <span className="font-mono text-xs text-foreground">{p.quantity}</span>
              </TableCell>
              <TableCell className="px-3 py-0">
                <span className="font-mono text-xs text-muted-foreground">
                  {p.unitWeightKg > 0 ? `${p.unitWeightKg} kg` : '—'}
                </span>
              </TableCell>
              <TableCell className="px-3 py-0">
                <span className="font-mono text-xs text-foreground">
                  {p.unitWeightKg > 0 ? `${(p.unitWeightKg * p.quantity).toFixed(1)} kg` : '—'}
                </span>
              </TableCell>
              <TableCell className="px-3 py-0">
                <div className="flex flex-wrap gap-1">
                  {p.constraints.length === 0 ? (
                    <span className="text-xs text-muted-foreground">—</span>
                  ) : (
                    p.constraints.map((c) => (
                      <Badge
                        key={c}
                        variant="secondary"
                        className="px-1.5 py-0 text-[10px] font-medium"
                      >
                        {CONSTRAINT_LABELS[c] ?? c}
                      </Badge>
                    ))
                  )}
                </div>
              </TableCell>
            </TableRow>
          )),
        )}
      </TableBody>
    </Table>
  );
}

// ─── ReportDetailPage ─────────────────────────────────────────────────────────

export function ReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: detail, isLoading, isError } = useReportDetail(id ?? '');
  const { mutate: downloadPdf, isPending: pdfPending } = useDownloadPlanPdf();
  const { mutate: downloadExcel, isPending: excelPending } = useDownloadReportExcel();

  const status = detail ? (STATUS_MAP[detail.status] ?? STATUS_MAP[0]) : null;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => void navigate('/reports')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                {isLoading ? (
                  <Skeleton className="h-6 w-48" />
                ) : (
                  (detail?.planName ?? 'Rapor Detayı')
                )}
              </h1>
              {status && (
                <Badge variant={status.variant} className="px-1.5 py-0 text-[10px] font-medium">
                  {status.label}
                </Badge>
              )}
            </div>
            {detail && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {detail.vehiclePlate !== '—' ? `${detail.vehiclePlate} · ` : ''}
                {detail.vehicleName !== '—' ? `${detail.vehicleName} · ` : ''}
                {formatDate(detail.date)}
              </p>
            )}
          </div>
        </div>

        {/* Download buttons */}
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            disabled={pdfPending || !detail}
            onClick={() => {
              if (detail) downloadPdf({ id: detail.id, planName: detail.planName });
            }}
          >
            {pdfPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileDown className="h-3.5 w-3.5" />
            )}
            PDF İndir
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            disabled={excelPending || !detail}
            onClick={() => {
              if (detail)
                downloadExcel({ planName: detail.planName, productGroups: detail.productGroups });
            }}
          >
            {excelPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-3.5 w-3.5" />
            )}
            Excel İndir
          </Button>
        </div>
      </div>

      {/* Error */}
      {isError && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Rapor yüklenirken bir hata oluştu.
        </p>
      )}

      {isLoading && <DetailSkeleton />}

      {detail && (
        <>
          {/* AC1: Özet metrik kartları */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <MetricCard
              title="Toplam Ağırlık"
              value={`${detail.totalWeightKg.toLocaleString('tr-TR')} kg`}
              sub={`Kapasite: ${detail.vehicleCapacityKg.toLocaleString('tr-TR')} kg`}
              progress={Math.min(100, (detail.totalWeightKg / detail.vehicleCapacityKg) * 100)}
            />
            <MetricCard
              title="Ağırlık Doluluk Oranı"
              value={<span className={fillRateColor(detail.fillRate)}>%{detail.fillRate}</span>}
              progress={detail.fillRate}
            />
            <MetricCard
              title="Hacim Doluluk Oranı"
              value={
                <span className={fillRateColor(detail.volumeFillRate)}>
                  %{detail.volumeFillRate}
                </span>
              }
              progress={detail.volumeFillRate}
            />
          </div>

          {/* AC1 / AC3: 3D Snapshot */}
          <div className="overflow-hidden rounded-2xl border border-border bg-background">
            <p className="border-b border-border px-4 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              3D Görünüm
            </p>
            {detail.snapshotUrl ? (
              <img
                src={detail.snapshotUrl}
                alt={`${detail.planName} 3D görünüm`}
                className="max-h-80 w-full object-contain"
              />
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 py-16">
                <ImageOff className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  Bu plan için görsel önizleme henüz oluşturulmamış.
                </p>
              </div>
            )}
          </div>

          {/* AC1: Ürün yerleştirme tablosu */}
          <div className="overflow-hidden rounded-2xl border border-border bg-background">
            <p className="border-b border-border px-4 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Ürün Listesi
            </p>
            <div className="overflow-x-auto">
              <ProductTable groups={detail.productGroups} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
