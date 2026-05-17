import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { toast } from 'sonner';
import type { AxiosError } from 'axios';
import { axiosInstance } from './axiosInstance';

const DRAFT_BASE = '/api/v1/draft-items';

interface ApiError {
  detail?: string;
  title?: string;
}

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
  createdAtUtc: z.string(),
});

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

export function useDraftItems(params: DraftItemsParams) {
  return useQuery({
    queryKey: ['draft-items', params] as const,
    queryFn: async () => {
      const p = new URLSearchParams();
      p.set('page', String(params.page));
      p.set('pageSize', String(params.pageSize));
      if (params.status !== undefined && params.status !== 0)
        p.set('status', String(params.status));
      const { data } = await axiosInstance.get<unknown>(`${DRAFT_BASE}?${p.toString()}`);
      const parsed = draftItemsPageResponseSchema.safeParse(data);
      if (!parsed.success) return { items: [], totalCount: 0, page: 1, pageSize: params.pageSize };
      return parsed.data.data;
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
  specialNotes?: string | null;
  constraintIds?: number[];
}

export function useUpdateDraftItem() {
  const queryClient = useQueryClient();
  return useMutation<
    unknown,
    AxiosError<ApiError>,
    { id: string; payload: UpdateDraftItemPayload }
  >({
    mutationFn: ({ id, payload }) =>
      axiosInstance.put(`${DRAFT_BASE}/${id}`, payload).then((r) => r.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['draft-items'] });
    },
    onError: (error) => {
      const detail = error.response?.data?.detail;
      toast.error(detail ?? 'Taslak ürün güncellenemedi.', { position: 'bottom-right' });
    },
  });
}

export function useApproveDraftItem() {
  const queryClient = useQueryClient();
  return useMutation<unknown, AxiosError<ApiError>, string>({
    mutationFn: (id) => axiosInstance.post(`${DRAFT_BASE}/${id}/approve`).then((r) => r.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['draft-items'] });
      void queryClient.invalidateQueries({ queryKey: ['items'] });
      toast.success('Ürün onaylandı.', { position: 'bottom-right' });
    },
    onError: (error) => {
      const detail = error.response?.data?.detail;
      toast.error(detail ?? 'Ürün onaylanamadı.', { position: 'bottom-right' });
    },
  });
}

export function useBulkApproveDraftItems() {
  const queryClient = useQueryClient();
  return useMutation<unknown, AxiosError<ApiError>, string[]>({
    mutationFn: (ids) =>
      axiosInstance.post(`${DRAFT_BASE}/approve-bulk`, { ids }).then((r) => r.data),
    onSuccess: (_data, ids) => {
      void queryClient.invalidateQueries({ queryKey: ['draft-items'] });
      void queryClient.invalidateQueries({ queryKey: ['items'] });
      toast.success(`${ids.length} ürün onaylandı.`, { position: 'bottom-right' });
    },
    onError: (error) => {
      const detail = error.response?.data?.detail;
      toast.error(detail ?? 'Toplu onaylama başarısız.', { position: 'bottom-right' });
    },
  });
}

export function useRejectDraftItem() {
  const queryClient = useQueryClient();
  return useMutation<unknown, AxiosError<ApiError>, string>({
    mutationFn: (id) => axiosInstance.post(`${DRAFT_BASE}/${id}/reject`).then((r) => r.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['draft-items'] });
      toast.success('Ürün reddedildi.', { position: 'bottom-right' });
    },
    onError: (error) => {
      const detail = error.response?.data?.detail;
      toast.error(detail ?? 'Ürün reddedilemedi.', { position: 'bottom-right' });
    },
  });
}
