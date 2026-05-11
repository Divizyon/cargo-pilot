import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { axiosInstance } from '@/lib/api/axiosInstance';
import type { CreateMemberFormValues } from '@/features/platform/schemas/createMemberSchema';

export const companyMemberSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string(),
  email: z.string().email(),
  role: z.enum(['admin', 'manager', 'viewer', 'operator']),
  isActive: z.boolean(),
  joinedAt: z.string(),
});

export type CompanyMember = z.infer<typeof companyMemberSchema>;

const MOCK_MEMBERS: CompanyMember[] = [
  {
    id: 'a1b2c3d4-0001-4000-8000-000000000001',
    fullName: 'Ahmet Kaya',
    email: 'ahmet.kaya@firma.com',
    role: 'admin',
    isActive: true,
    joinedAt: '2024-01-15',
  },
  {
    id: 'a1b2c3d4-0002-4000-8000-000000000002',
    fullName: 'Elif Şahin',
    email: 'elif.sahin@firma.com',
    role: 'operator',
    isActive: true,
    joinedAt: '2024-03-02',
  },
  {
    id: 'a1b2c3d4-0003-4000-8000-000000000003',
    fullName: 'Mert Demir',
    email: 'mert.demir@firma.com',
    role: 'operator',
    isActive: true,
    joinedAt: '2024-05-10',
  },
  {
    id: 'a1b2c3d4-0004-4000-8000-000000000004',
    fullName: 'Selin Arslan',
    email: 'selin.arslan@firma.com',
    role: 'operator',
    isActive: false,
    joinedAt: '2023-11-20',
  },
  {
    id: 'a1b2c3d4-0005-4000-8000-000000000005',
    fullName: 'Can Yıldız',
    email: 'can.yildiz@firma.com',
    role: 'operator',
    isActive: true,
    joinedAt: '2025-01-08',
  },
  {
    id: 'a1b2c3d4-0006-4000-8000-000000000006',
    fullName: 'Zeynep Çelik',
    email: 'zeynep.celik@firma.com',
    role: 'admin',
    isActive: true,
    joinedAt: '2025-03-17',
  },
];

export function useCompanyMembers() {
  const companyId = useAuthStore((s) => s.user?.companyId ?? 'guest');
  return useQuery({
    queryKey: ['company-members', companyId] as const,
    queryFn: (): CompanyMember[] => companyMemberSchema.array().parse(MOCK_MEMBERS),
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
      axiosInstance
        .patch(`/api/v1/company-members/${id}`, { role })
        .then(() => undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-members', companyId] });
    },
  });
}

export function useRemoveMemberAccess() {
  const queryClient = useQueryClient();
  const companyId = useAuthStore((s) => s.user?.companyId ?? 'guest');

  return useMutation<void, Error, string>({
    mutationFn: (id) =>
      axiosInstance.delete(`/api/users/${id}`).then(() => undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-members', companyId] });
    },
  });
}
