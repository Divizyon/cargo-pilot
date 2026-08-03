import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { axiosInstance } from '@/lib/api/axiosInstance';
import type { CreateMemberFormValues } from '@/features/platform/schemas/createMemberSchema';

/** Backend `CompanyUserDto` — rol yalnızca "Admin" veya "Operator" döner. */
const companyUserDtoSchema = z.object({
  id: z.string().uuid(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
  role: z.enum(['Admin', 'Operator']),
  isActive: z.boolean(),
});

export const companyMemberSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string(),
  email: z.string().email(),
  role: z.enum(['admin', 'operator']),
  isActive: z.boolean(),
});

export type CompanyMember = z.infer<typeof companyMemberSchema>;

/** Backend `UserType`: SuperAdmin=0, CompanyAdmin=1, CompanyWorker=2, Individual=3. */
const USER_TYPE_BY_ROLE: Record<CompanyMember['role'], number> = {
  admin: 1,
  operator: 2,
};

const API_ROLE_BY_ROLE: Record<CompanyMember['role'], 'Admin' | 'Operator'> = {
  admin: 'Admin',
  operator: 'Operator',
};

const listResponseSchema = z.object({
  isSuccess: z.boolean().optional(),
  data: z.array(z.unknown()).nullable().optional(),
});

function toCompanyMember(dto: z.infer<typeof companyUserDtoSchema>): CompanyMember {
  return {
    id: dto.id,
    fullName: `${dto.firstName} ${dto.lastName}`.trim(),
    email: dto.email,
    role: dto.role === 'Admin' ? 'admin' : 'operator',
    isActive: dto.isActive,
  };
}

async function fetchCompanyMembers(): Promise<CompanyMember[]> {
  const { data: raw } = await axiosInstance.get<unknown>('/api/v1/company/users');
  const items = listResponseSchema.parse(raw).data ?? [];
  return items.map((item) => toCompanyMember(companyUserDtoSchema.parse(item)));
}

export function useCompanyMembers() {
  const companyId = useAuthStore((s) => s.user?.companyId ?? 'guest');
  return useQuery({
    queryKey: ['company-members', companyId] as const,
    queryFn: fetchCompanyMembers,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateCompanyMember() {
  const queryClient = useQueryClient();
  const companyId = useAuthStore((s) => s.user?.companyId ?? 'guest');

  return useMutation<CompanyMember, Error, CreateMemberFormValues>({
    mutationFn: async (values) => {
      const { data: raw } = await axiosInstance.post<unknown>('/api/v1/company/users', {
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        password: values.password,
        role: API_ROLE_BY_ROLE[values.role],
      });
      const parsed = z.object({ data: z.unknown() }).parse(raw);
      return toCompanyMember(companyUserDtoSchema.parse(parsed.data));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['company-members', companyId] });
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
      axiosInstance
        .patch(`/api/v1/company/users/${id}`, { newUserType: USER_TYPE_BY_ROLE[role] })
        .then(() => undefined),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['company-members', companyId] });
    },
  });
}

/**
 * Kullanıcı silme ucu yoktur; erişim kaldırma pasife alma ile yapılır.
 * Backend pasife alırken aktif oturumları iptal eder ve bilgilendirme e-postası gönderir.
 */
export function useRemoveMemberAccess() {
  const queryClient = useQueryClient();
  const companyId = useAuthStore((s) => s.user?.companyId ?? 'guest');

  return useMutation<void, Error, string>({
    mutationFn: (id) =>
      axiosInstance
        .patch(`/api/v1/company/users/${id}/status`, { isActive: false })
        .then(() => undefined),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['company-members', companyId] });
    },
  });
}
