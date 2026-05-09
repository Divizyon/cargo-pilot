import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { axiosInstance } from './axiosInstance';

export const planReportSchema = z.object({
  id: z.string().uuid(),
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
    id: z.string().uuid(),
    planName: z.string().optional(),
    createdAtUtc: z.string().optional(),
    vehiclePlate: z.string().nullable().optional(),
    fillRate: z.number().nullable().optional(),
    status: z.number().int().optional(),
    reportId: z.string().uuid().nullable().optional(),
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

function mapReportItem(raw: z.infer<typeof reportApiItemSchema>): PlanReport {
  return {
    id: raw.id,
    planName: raw.planName ?? '—',
    date: (raw.createdAtUtc ?? new Date(0).toISOString()).slice(0, 10),
    vehiclePlate: raw.vehiclePlate ?? '—',
    fillRate: Math.min(100, Math.max(0, Math.round(raw.fillRate ?? 0))),
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
