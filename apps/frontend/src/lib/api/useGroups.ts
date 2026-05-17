import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { toast } from 'sonner';
import { axiosInstance } from './axiosInstance';

interface ProblemDetails {
  detail?: string;
}

// ─── Create ───────────────────────────────────────────────────────────────────

interface CreateGroupInput {
  planId: string;
  name: string;
  color: string;
  unloadingOrder: number;
}

export function useCreateGroup() {
  const queryClient = useQueryClient();
  return useMutation<string, AxiosError<ProblemDetails>, CreateGroupInput>({
    mutationFn: async ({ planId, name, color, unloadingOrder }) => {
      const { data } = await axiosInstance.post<unknown>(`/api/v1/loading-plans/${planId}/groups`, {
        name,
        color,
        unloadingOrder,
      });
      if (typeof data === 'string') return data;
      const raw = data as Record<string, unknown>;
      const nested = raw['data'];
      const id =
        (typeof nested === 'string' ? nested : undefined) ??
        (typeof nested === 'object' && nested !== null
          ? ((nested as Record<string, unknown>)['id'] as string | undefined)
          : undefined) ??
        (typeof raw['id'] === 'string' ? raw['id'] : undefined);
      if (!id) throw new Error('Grup ID alınamadı');
      return id;
    },
    onSuccess: (_id, { planId }) => {
      void queryClient.invalidateQueries({ queryKey: ['loading-plan-detail', planId] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail ?? 'Grup oluşturulamadı.', {
        position: 'bottom-right',
      });
    },
  });
}

// ─── Update ───────────────────────────────────────────────────────────────────

interface UpdateGroupInput {
  planId: string;
  groupId: string;
  name: string;
  color: string;
  unloadingOrder: number;
}

export function useUpdateGroup() {
  const queryClient = useQueryClient();
  return useMutation<void, AxiosError<ProblemDetails>, UpdateGroupInput>({
    mutationFn: async ({ planId, groupId, name, color, unloadingOrder }) => {
      await axiosInstance.put(`/api/v1/loading-plans/${planId}/groups/${groupId}`, {
        name,
        color,
        unloadingOrder,
      });
    },
    onSuccess: (_data, { planId }) => {
      void queryClient.invalidateQueries({ queryKey: ['loading-plan-detail', planId] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail ?? 'Grup güncellenemedi.', {
        position: 'bottom-right',
      });
    },
  });
}

// ─── Delete ───────────────────────────────────────────────────────────────────

interface DeleteGroupInput {
  planId: string;
  groupId: string;
}

export function useDeleteGroup() {
  const queryClient = useQueryClient();
  return useMutation<void, AxiosError<ProblemDetails>, DeleteGroupInput>({
    mutationFn: async ({ planId, groupId }) => {
      await axiosInstance.delete(`/api/v1/loading-plans/${planId}/groups/${groupId}`, {
        data: { moveItemsToNull: true },
      });
    },
    onSuccess: (_data, { planId }) => {
      void queryClient.invalidateQueries({ queryKey: ['loading-plan-detail', planId] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail ?? 'Grup silinemedi.', {
        position: 'bottom-right',
      });
    },
  });
}

// ─── Assign item to group ─────────────────────────────────────────────────────

interface AssignItemToGroupInput {
  planId: string;
  inputItemId: string;
  groupId: string | null;
}

export function useAssignItemToGroup() {
  const queryClient = useQueryClient();
  return useMutation<void, AxiosError<ProblemDetails>, AssignItemToGroupInput>({
    mutationFn: async ({ planId, inputItemId, groupId }) => {
      await axiosInstance.put(`/api/v1/loading-plans/${planId}/items/${inputItemId}/group`, {
        groupId,
      });
    },
    onSuccess: (_data, { planId }) => {
      void queryClient.invalidateQueries({ queryKey: ['loading-plan-detail', planId] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail ?? 'Ürün gruba atanamadı.', {
        position: 'bottom-right',
      });
    },
  });
}
