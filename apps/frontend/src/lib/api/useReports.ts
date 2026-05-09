import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { useAuthStore } from '@/lib/store/useAuthStore';

export const planReportSchema = z.object({
  id: z.string().uuid(),
  planName: z.string(),
  date: z.string(),
  vehicle: z.string(),
  totalWeightKg: z.number(),
  fillRate: z.number().min(0).max(100),
});

export type PlanReport = z.infer<typeof planReportSchema>;

const MOCK_REPORTS: PlanReport[] = [
  {
    id: 'a1b2c3d4-0001-0000-0000-000000000001',
    planName: 'İstanbul → Ankara #001',
    date: '2026-05-05',
    vehicle: '34 ABC 001',
    totalWeightKg: 18400,
    fillRate: 92,
  },
  {
    id: 'a1b2c3d4-0002-0000-0000-000000000002',
    planName: 'İzmir → Bursa #012',
    date: '2026-05-06',
    vehicle: '35 DEF 202',
    totalWeightKg: 12750,
    fillRate: 76,
  },
  {
    id: 'a1b2c3d4-0003-0000-0000-000000000003',
    planName: 'Ankara → Konya #023',
    date: '2026-05-06',
    vehicle: '06 GHI 303',
    totalWeightKg: 21000,
    fillRate: 98,
  },
  {
    id: 'a1b2c3d4-0004-0000-0000-000000000004',
    planName: 'Konya → Adana #034',
    date: '2026-05-07',
    vehicle: '42 JKL 404',
    totalWeightKg: 9800,
    fillRate: 58,
  },
  {
    id: 'a1b2c3d4-0005-0000-0000-000000000005',
    planName: 'Adana → Gaziantep #045',
    date: '2026-05-07',
    vehicle: '01 MNO 505',
    totalWeightKg: 15600,
    fillRate: 84,
  },
  {
    id: 'a1b2c3d4-0006-0000-0000-000000000006',
    planName: 'Bursa → Eskişehir #056',
    date: '2026-05-08',
    vehicle: '16 PQR 606',
    totalWeightKg: 8200,
    fillRate: 47,
  },
  {
    id: 'a1b2c3d4-0007-0000-0000-000000000007',
    planName: 'Trabzon → Samsun #067',
    date: '2026-05-08',
    vehicle: '61 STU 707',
    totalWeightKg: 19300,
    fillRate: 89,
  },
  {
    id: 'a1b2c3d4-0008-0000-0000-000000000008',
    planName: 'Samsun → Ankara #078',
    date: '2026-05-09',
    vehicle: '55 VWX 808',
    totalWeightKg: 22000,
    fillRate: 100,
  },
];

export function useReports() {
  const companyId = useAuthStore((s) => s.user?.id ?? 'guest');
  return useQuery({
    queryKey: ['reports', companyId] as const,
    queryFn: (): PlanReport[] => planReportSchema.array().parse(MOCK_REPORTS),
    staleTime: 5 * 60 * 1000,
  });
}
