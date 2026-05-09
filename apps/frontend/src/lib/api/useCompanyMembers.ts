import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { useAuthStore } from '@/lib/store/useAuthStore';

export const companyMemberSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string(),
  email: z.string().email(),
  role: z.enum(['admin', 'manager', 'viewer']),
  isActive: z.boolean(),
  joinedAt: z.string(),
});

export type CompanyMember = z.infer<typeof companyMemberSchema>;

const MOCK_MEMBERS: CompanyMember[] = [
  {
    id: 'cm-0001-0000-0000-000000000001',
    fullName: 'Ahmet Kaya',
    email: 'ahmet.kaya@firma.com',
    role: 'admin',
    isActive: true,
    joinedAt: '2024-01-15',
  },
  {
    id: 'cm-0002-0000-0000-000000000002',
    fullName: 'Elif Şahin',
    email: 'elif.sahin@firma.com',
    role: 'manager',
    isActive: true,
    joinedAt: '2024-03-02',
  },
  {
    id: 'cm-0003-0000-0000-000000000003',
    fullName: 'Mert Demir',
    email: 'mert.demir@firma.com',
    role: 'viewer',
    isActive: true,
    joinedAt: '2024-05-10',
  },
  {
    id: 'cm-0004-0000-0000-000000000004',
    fullName: 'Selin Arslan',
    email: 'selin.arslan@firma.com',
    role: 'manager',
    isActive: false,
    joinedAt: '2023-11-20',
  },
  {
    id: 'cm-0005-0000-0000-000000000005',
    fullName: 'Can Yıldız',
    email: 'can.yildiz@firma.com',
    role: 'viewer',
    isActive: true,
    joinedAt: '2025-01-08',
  },
  {
    id: 'cm-0006-0000-0000-000000000006',
    fullName: 'Zeynep Çelik',
    email: 'zeynep.celik@firma.com',
    role: 'viewer',
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
