import { useMutation, useQuery } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import { z } from 'zod';
import { toast } from 'sonner';
import type { PlanProductGroup } from '@/lib/types/loadingPlan';
import { axiosInstance } from './axiosInstance';
import {
  planDetailApiResponseSchema,
  fromApiDetailPlacements,
  planFullDetailApiResponseSchema,
  fromApiFullDetail,
} from './loadingPlanMappers';
import { exportPlanToPdf } from '@/lib/utils/exportPlanToPdf';

export const planReportSchema = z.object({
  id: z.uuid(),
  planName: z.string(),
  date: z.string(),
  vehiclePlate: z.string(),
  fillRate: z.number().min(0).max(100),
  status: z.number().int(),
  downloadUrl: z.string().nullable(),
});

export type PlanReport = z.infer<typeof planReportSchema>;

export interface ReportsFilters {
  startDate?: string;
  endDate?: string;
  vehicleId?: string;
  minFillRate?: number;
  maxFillRate?: number;
}

export interface ReportsPage {
  items: PlanReport[];
  totalCount: number;
}

const reportApiItemSchema = z
  .object({
    id: z.uuid(),
    planName: z.string().optional(),
    createdAtUtc: z.string().optional(),
    vehiclePlate: z.string().nullable().optional(),
    fillRate: z.number().nullable().optional(),
    status: z.number().int().optional(),
    reportId: z.uuid().nullable().optional(),
    downloadUrl: z.string().nullable().optional(),
  })
  .passthrough();

const reportsApiResponseSchema = z
  .object({
    isSuccess: z.boolean().optional(),
    data: z
      .object({
        items: z.array(z.unknown()).optional(),
        totalCount: z.number().int().optional(),
      })
      .passthrough(),
  })
  .passthrough();

function toFillPct(value: number | null | undefined): number {
  const v = value ?? 0;
  const pct = v <= 1 ? v * 100 : v;
  return Math.min(100, Math.max(0, Math.round(pct)));
}

function mapReportItem(raw: z.infer<typeof reportApiItemSchema>): PlanReport {
  return {
    id: raw.id,
    planName: raw.planName ?? '—',
    date: (raw.createdAtUtc ?? new Date(0).toISOString()).slice(0, 10),
    vehiclePlate: raw.vehiclePlate ?? '—',
    fillRate: toFillPct(raw.fillRate),
    status: raw.status ?? 0,
    downloadUrl: raw.downloadUrl ?? null,
  };
}

export function useReports(filters?: ReportsFilters, page = 1, pageSize = 10) {
  return useQuery({
    queryKey: ['reports', filters, page, pageSize] as const,
    queryFn: async (): Promise<ReportsPage> => {
      const params: Record<string, string | number> = { page, pageSize };
      if (filters?.startDate) params['startDate'] = filters.startDate;
      if (filters?.endDate) params['endDate'] = filters.endDate;
      if (filters?.vehicleId) params['vehicleId'] = filters.vehicleId;
      if (filters?.minFillRate !== undefined) params['minFillRate'] = filters.minFillRate;
      if (filters?.maxFillRate !== undefined) params['maxFillRate'] = filters.maxFillRate;

      const { data: raw } = await axiosInstance.get<unknown>('/api/v1/loading-plans/reports', {
        params,
      });

      const parsed = reportsApiResponseSchema.safeParse(raw);
      if (!parsed.success) {
        console.error('[useReports] parse error', parsed.error);
        return { items: [], totalCount: 0 };
      }

      const d = parsed.data.data;
      const rawItems = (d.items as unknown[] | undefined) ?? [];
      const totalCount = (d.totalCount as number | undefined) ?? rawItems.length;

      const items = rawItems
        .map((item) => {
          const r = reportApiItemSchema.safeParse(item);
          return r.success ? mapReportItem(r.data) : null;
        })
        .filter((x): x is PlanReport => x !== null);

      return { items, totalCount };
    },
    staleTime: 2 * 60 * 1000,
  });
}

// ─── Report detail types ──────────────────────────────────────────────────────

export interface ReportDetail {
  id: string;
  planName: string;
  vehiclePlate: string;
  vehicleName: string;
  date: string;
  status: number;
  totalWeightKg: number;
  vehicleCapacityKg: number;
  fillRate: number;
  volumeFillRate: number;
  snapshotUrl: string | null;
  productGroups: PlanProductGroup[];
}

const reportDetailApiSchema = z
  .object({
    isSuccess: z.boolean().optional(),
    data: z
      .object({
        id: z.string().uuid(),
        planName: z.string().optional(),
        createdAt: z.string().optional(),
        createdAtUtc: z.string().optional(),
        fillRate: z.number().nullable().optional(),
        volumeFillRate: z.number().nullable().optional(),
        totalWeight: z.number().nullable().optional(),
        totalWeightKg: z.number().nullable().optional(),
        status: z.union([z.string(), z.number()]).nullable().optional(),
        optimizationStatus: z.union([z.string(), z.number()]).nullable().optional(),
        snapshotUrl: z.string().nullable().optional(),
        snapshotImageUrl: z.string().nullable().optional(),
        vehicle: z
          .object({
            vehicleName: z.string().optional(),
            name: z.string().optional(),
            plateNumber: z.string().nullable().optional(),
            plate: z.string().nullable().optional(),
            maxWeightCapacity: z.number().optional(),
          })
          .passthrough()
          .nullable()
          .optional(),
      })
      .passthrough(),
  })
  .passthrough();

function mapStatusToInt(raw: string | number | null | undefined): number {
  if (raw == null) return 0;
  if (typeof raw === 'number') return raw;
  const s = raw.toLowerCase();
  if (s === 'completed' || s === 'tamamlandi' || s === 'done') return 2;
  if (s === 'active' || s === 'aktif' || s === 'processing' || s === 'optimizing') return 1;
  if (s === 'cancelled' || s === 'canceled' || s === 'iptal' || s === 'failed') return 3;
  return 0;
}

export function useReportDetail(id: string) {
  return useQuery({
    queryKey: ['report-detail', id] as const,
    queryFn: async (): Promise<ReportDetail | null> => {
      const { data } = await axiosInstance.get<unknown>(`/api/v1/loading-plans/${id}`);

      const parsed = reportDetailApiSchema.safeParse(data);
      if (!parsed.success) {
        console.error('[useReportDetail] parse error', parsed.error);
        return null;
      }

      const d = parsed.data.data;
      const v = d.vehicle;

      const rawPlacements = planDetailApiResponseSchema.safeParse(data);
      const rawPlacementsArr = rawPlacements.success
        ? (rawPlacements.data.data.placements ??
          rawPlacements.data.data.placementDetails ??
          (rawPlacements.data.data as Record<string, unknown>)['items'])
        : undefined;

      const productGroups = Array.isArray(rawPlacementsArr)
        ? fromApiDetailPlacements(rawPlacementsArr)
        : [];

      const totalWeightKg = d.totalWeight ?? d.totalWeightKg ?? 0;
      const vehicleCapacityKg = v?.maxWeightCapacity ?? 1;
      const weightFillRate =
        vehicleCapacityKg > 0 ? Math.min(100, Math.round((totalWeightKg / vehicleCapacityKg) * 100)) : 0;

      return {
        id: d.id,
        planName: d.planName ?? '—',
        vehiclePlate: v?.plateNumber ?? v?.plate ?? '—',
        vehicleName: v?.vehicleName ?? v?.name ?? '—',
        date: (d.createdAt ?? d.createdAtUtc ?? new Date(0).toISOString()).slice(0, 10),
        status: mapStatusToInt(d.status ?? d.optimizationStatus),
        totalWeightKg,
        vehicleCapacityKg,
        fillRate: weightFillRate,
        volumeFillRate: toFillPct(d.volumeFillRate ?? d.fillRate),
        snapshotUrl: d.snapshotUrl ?? d.snapshotImageUrl ?? null,
        productGroups,
      };
    },
    enabled: Boolean(id),
    staleTime: 5 * 60 * 1000,
  });
}

async function fetchSnapshotAsDataUrl(url: string): Promise<string | undefined> {
  try {
    const res = await fetch(url);
    if (!res.ok) return undefined;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return undefined;
  }
}

export function useDownloadPlanPdf() {
  return useMutation({
    mutationFn: async ({ id }: { id: string; planName: string }) => {
      const { data: raw } = await axiosInstance.get<unknown>(`/api/v1/loading-plans/${id}`);
      const parsed = planFullDetailApiResponseSchema.safeParse(raw);
      if (!parsed.success) throw new Error('Plan verisi alınamadı');
      const detail = fromApiFullDetail(parsed.data.data);
      const rawData = parsed.data.data as Record<string, unknown>;
      const remoteUrl = (rawData.thumbnailUrl ??
        rawData.snapshotUrl ??
        rawData.snapshotImageUrl) as string | null | undefined;

      const snapshotDataUrl = remoteUrl ? await fetchSnapshotAsDataUrl(remoteUrl) : undefined;

      await exportPlanToPdf({
        planId: id,
        placements: detail.placements,
        items: detail.inputItems.map((ii) => ii.item),
        vehicle: detail.vehicle,
        snapshotDataUrl,
      });
    },
    onError: () => {
      toast.error('PDF oluşturulamadı. Lütfen tekrar deneyin.', { position: 'bottom-right' });
    },
  });
}

export function useDownloadReportExcel() {
  return useMutation({
    mutationFn: async ({
      planName,
      productGroups,
    }: {
      planName: string;
      productGroups: PlanProductGroup[];
    }) => {
      const rows = productGroups.flatMap((g) =>
        g.products.map((p) => ({
          Grup: g.name,
          'Ürün Adı': p.name,
          Adet: p.quantity,
          'Birim Ağırlık (kg)': p.unitWeightKg,
          'Toplam Ağırlık (kg)': +(p.unitWeightKg * p.quantity).toFixed(2),
          'Kat Sayısı': p.layerCount,
          Kısıtlamalar: p.constraints.join(', ') || '—',
        })),
      );

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Yükleme Raporu');

      const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${planName}_rapor.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    },
  });
}
