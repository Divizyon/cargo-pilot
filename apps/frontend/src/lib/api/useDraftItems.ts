import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { toast } from 'sonner';
import type { AxiosError } from 'axios';
import { axiosInstance } from './axiosInstance';
import { getApiErrorMessage, type ApiErrorResponse } from './apiError';

const DRAFT_BASE = '/api/v1/draft-items';

export const DRAFT_PENDING = 0;
export const DRAFT_APPROVED = 1;
export const DRAFT_REJECTED = 2;
export const DRAFT_UPDATE_PENDING = 3;

export const draftItemSchema = z.object({
  id: z.string().uuid(),
  erpId: z.string().nullable().optional(),
  status: z.number().int(),
  sku: z.string().nullable().optional(),
  barcode: z.string().nullable().optional(),
  name: z.string(),
  productType: z.string().nullable().optional(),
  category: z.number().int(),
  width: z.number(),
  height: z.number(),
  length: z.number(),
  diameter: z.number().nullable().optional(),
  weight: z.number(),
  fragilityType: z.number().int(),
  isStackable: z.boolean(),
  maxStackCount: z.number().int(),
  maxWeightOnTop: z.number(),
  allowedRotations: z.number().int(),
  imageUrl: z.string().nullable().optional(),
  stackGroup: z.string().nullable().optional(),
  specialNotes: z.string().nullable().optional(),
  constraintIds: z.array(z.number().int()),
  /** Kullanıcının taslakta seçtiği yük grupları; onayda ürüne birebir taşınır. */
  incompatibleGroups: z.array(z.string()).default([]),
  createdAtUtc: z.string(),
  integrationSystemName: z.string().nullable().optional(),
  /** ERP kaynağında boş/sıfır gelen alan adları (backend: DraftItemField). */
  missingFields: z.array(z.string()).default([]),
});

/** Backend sözleşmesi: CargoPilot.Domain/Entities/DraftItemField */
export const DRAFT_FIELD = {
  Width: 'width',
  Height: 'height',
  Length: 'length',
  Weight: 'weight',
} as const;

export type DraftItem = z.infer<typeof draftItemSchema>;

const draftItemsPageResponseSchema = z.object({
  isSuccess: z.boolean(),
  data: z.object({
    items: z.array(draftItemSchema),
    totalCount: z.number().int(),
    page: z.number().int(),
    pageSize: z.number().int(),
  }),
});

export interface DraftItemsParams {
  page: number;
  pageSize: number;
  status?: number;
}

export function useDraftItems(params: DraftItemsParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['draft-items', params] as const,
    enabled: options?.enabled ?? true,
    queryFn: async () => {
      const p = new URLSearchParams();
      p.set('page', String(params.page));
      p.set('pageSize', String(params.pageSize));
      if (params.status !== undefined) p.set('status', String(params.status));
      const { data } = await axiosInstance.get<unknown>(`${DRAFT_BASE}?${p.toString()}`);
      // Parse/HTTP hatasi yutulmaz; cagiran bilesen isError dalini render eder.
      return draftItemsPageResponseSchema.parse(data).data;
    },
  });
}

export interface UpdateDraftItemPayload {
  productType?: string;
  category?: number;
  width?: number;
  height?: number;
  length?: number;
  weight?: number;
  diameter?: number | null;
  fragilityType?: number;
  isStackable?: boolean;
  maxStackCount?: number;
  maxWeightOnTop?: number;
  allowedRotations?: number;
  barcode?: string | null;
  imageUrl?: string | null;
  stackGroup?: string | null;
  /** Zorunlu iş kuralı: boş gönderilen taslak onay adımında reddedilir. */
  incompatibleGroups?: string[];
  specialNotes?: string | null;
  constraintIds?: number[];
}

export function useUpdateDraftItem() {
  const queryClient = useQueryClient();
  return useMutation<
    unknown,
    AxiosError<ApiErrorResponse>,
    { id: string; payload: UpdateDraftItemPayload }
  >({
    mutationFn: ({ id, payload }) =>
      axiosInstance.put(`${DRAFT_BASE}/${id}`, payload).then((r) => r.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['draft-items'] });
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Taslak ürün güncellenemedi.'), {
        position: 'bottom-right',
      });
    },
  });
}

const skippedDraftItemSchema = z.object({
  id: z.string(),
  sku: z.string().nullable().optional(),
  reason: z.string(),
});

/** Backend sözleşmesi: ApproveDraftItemsResult (approved / skipped / skippedItems). */
export const approveDraftItemsResultSchema = z.object({
  approved: z.number().int(),
  skipped: z.number().int(),
  skippedItems: z.array(skippedDraftItemSchema).default([]),
});

export type ApproveDraftItemsResult = z.infer<typeof approveDraftItemsResultSchema>;

const approveDraftItemsResponseSchema = z.object({
  isSuccess: z.boolean(),
  data: approveDraftItemsResultSchema,
});

const MAX_SUMMARY_REASONS = 2;

/** Toplu onayın kısmi sonucunu kullanıcı diline çevirir; sayılar backend'den gelir. */
export function formatApproveSummary(result: ApproveDraftItemsResult): string {
  if (result.skipped === 0) return `${result.approved} ürün aktarıldı.`;
  const reasons = Array.from(new Set(result.skippedItems.map((s) => s.reason)))
    .slice(0, MAX_SUMMARY_REASONS)
    .join(' · ');
  const detail = reasons ? ` (${reasons})` : '';
  return `${result.approved} ürün aktarıldı, ${result.skipped} ürün atlandı${detail}`;
}

export function useBulkApproveDraftItems() {
  const queryClient = useQueryClient();
  return useMutation<ApproveDraftItemsResult, AxiosError<ApiErrorResponse>, string[]>({
    mutationFn: async (ids) => {
      const { data } = await axiosInstance.post<unknown>(`${DRAFT_BASE}/approve-bulk`, { ids });
      return approveDraftItemsResponseSchema.parse(data).data;
    },
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ['draft-items'] });
      void queryClient.invalidateQueries({ queryKey: ['items'] });
      const summary = formatApproveSummary(result);
      if (result.approved === 0 && result.skipped > 0) {
        toast.warning(summary, { position: 'bottom-right' });
        return;
      }
      toast.success(summary, { position: 'bottom-right' });
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Toplu onaylama başarısız.'), {
        position: 'bottom-right',
      });
    },
  });
}

export function useRejectDraftItem() {
  const queryClient = useQueryClient();
  return useMutation<unknown, AxiosError<ApiErrorResponse>, string>({
    mutationFn: (id) => axiosInstance.post(`${DRAFT_BASE}/${id}/reject`).then((r) => r.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['draft-items'] });
      toast.success('Ürün reddedildi.', { position: 'bottom-right' });
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Ürün reddedilemedi.'), { position: 'bottom-right' });
    },
  });
}

export function useBulkRejectDraftItems() {
  const queryClient = useQueryClient();
  return useMutation<void, AxiosError<ApiErrorResponse>, string[]>({
    mutationFn: (ids) =>
      Promise.all(ids.map((id) => axiosInstance.post(`${DRAFT_BASE}/${id}/reject`))).then(() => {}),
    onSuccess: (_data, ids) => {
      void queryClient.invalidateQueries({ queryKey: ['draft-items'] });
      void queryClient.invalidateQueries({ queryKey: ['items'] });
      toast.success(`${ids.length} güncelleme reddedildi.`, { position: 'bottom-right' });
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Reddetme işlemi başarısız.'), {
        position: 'bottom-right',
      });
    },
  });
}
