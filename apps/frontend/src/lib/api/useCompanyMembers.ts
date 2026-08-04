import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { axiosInstance } from '@/lib/api/axiosInstance';
import type { CreateMemberFormValues } from '@/features/platform/members/schemas/createMemberSchema';

export const companyMemberSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string(),
  email: z.string().email(),
  role: z.enum(['admin', 'manager', 'viewer', 'operator']),
  isActive: z.boolean(),
  joinedAt: z.string(),
});

export type CompanyMember = z.infer<typeof companyMemberSchema>;

const apiResponseSchema = z
  .object({
    isSuccess: z.boolean().optional(),
    data: z.unknown(),
  })
  .passthrough();

async function fetchCompanyMembers(): Promise<CompanyMember[]> {
  const { data: raw } = await axiosInstance.get<unknown>('/api/v1/company-members');
  const parsed = apiResponseSchema.safeParse(raw);
  const items: unknown[] = parsed.success
    ? Array.isArray(parsed.data.data)
      ? (parsed.data.data as unknown[])
      : (((parsed.data.data as Record<string, unknown>)?.['items'] as unknown[] | undefined) ?? [])
    : Array.isArray(raw)
      ? (raw as unknown[])
      : [];
  return items
    .map((item) => {
      const r = companyMemberSchema.safeParse(item);
      return r.success ? r.data : null;
    })
    .filter((x): x is CompanyMember => x !== null);
}

export function useCompanyMembers() {
  const companyId = useAuthStore((s) => s.user?.companyId ?? 'guest');
  return useQuery({
    queryKey: ['company-members', companyId] as const,
    queryFn: fetchCompanyMembers,
    staleTime: 5 * 60 * 1000,
  });
}

type CreateMemberPayload = CreateMemberFormValues;

interface CreateMemberResponse {
  isSuccess: boolean;
  message: string;
  data: CompanyMember;
}

export function useCreateCompanyMember() {
  const queryClient = useQueryClient();
  const companyId = useAuthStore((s) => s.user?.companyId ?? 'guest');

  return useMutation<CreateMemberResponse, Error, CreateMemberPayload>({
    mutationFn: (payload) =>
      axiosInstance
        .post<CreateMemberResponse>('/api/v1/company-members', payload)
        .then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-members', companyId] });
    },
  });
}

interface UpdateRolePayload {
  id: string;
  role: CompanyMember['role'];
}

export function useUpdateMemberRole() {
  const queryClient = useQueryClient();
  const companyId = useAuthStore((s) => s.user?.companyId ?? 'guest');

  return useMutation<void, Error, UpdateRolePayload>({
    mutationFn: ({ id, role }) =>
      axiosInstance.patch(`/api/v1/company-members/${id}`, { role }).then(() => undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-members', companyId] });
    },
  });
}

export function useRemoveMemberAccess() {
  const queryClient = useQueryClient();
  const companyId = useAuthStore((s) => s.user?.companyId ?? 'guest');

  return useMutation<void, Error, string>({
    mutationFn: (id) => axiosInstance.delete(`/api/users/${id}`).then(() => undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-members', companyId] });
    },
  });
}
