import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { toast } from 'sonner';
import type { AxiosError } from 'axios';
import {
  loadingPlanSchema,
  planProductGroupSchema,
  type LoadingPlanListItem,
  type PlanProductGroup,
} from '@/lib/types/loadingPlan';
import { apiFetch } from './fetcher';
import { axiosInstance } from './axiosInstance';
import { planDetailApiResponseSchema, fromApiPlanListItem } from './loadingPlanMappers';

// ─── Existing plan detail (3D viewer) ─────────────────────────────────────────

export function useLoadingPlans(filters?: { vehicleId?: string; page?: number }) {
  return useQuery({
    queryKey: ['loading-plans', filters] as const,
    queryFn: () => apiFetch('/loading-plans', z.array(loadingPlanSchema)),
  });
}

export function useLoadingPlan(id: string) {
  return useQuery({
    queryKey: ['loading-plans', id] as const,
    queryFn: () => apiFetch(`/loading-plans/${id}`, loadingPlanSchema),
    enabled: Boolean(id),
  });
}

// ─── List view types ───────────────────────────────────────────────────────────

export interface LoadingPlanListFilters {
  search?: string;
  status?: string;
  plate?: string;
  vehicleNames?: string[];
  dateFrom?: string;
  dateTo?: string;
}

export interface LoadingPlanListPage {
  items: LoadingPlanListItem[];
  totalCount: number;
  allVehicleNames: string[];
}

// ─── List hook (geçici mock — gerçek API bağlandığında değiştirilecek) ────────

export function useLoadingPlanList(filters?: LoadingPlanListFilters, page = 1, pageSize = 10) {
  return useQuery({
    queryKey: ['loading-plan-list', filters, page, pageSize] as const,
    queryFn: async (): Promise<LoadingPlanListPage> => {
      const allVehicleNames = [...new Set(MOCK_LOADING_PLANS.map((p) => p.vehicleName))];
      const filtered = applyMockFilters(MOCK_LOADING_PLANS, filters);
      const totalCount = filtered.length;
      const start = (page - 1) * pageSize;
      const items = filtered.slice(start, start + pageSize);
      return { items, totalCount, allVehicleNames };
    },
    staleTime: 2 * 60 * 1000,
  });
}

// ─── Single list-item (detail page) ───────────────────────────────────────────

export function useLoadingPlanListItem(id: string) {
  return useQuery({
    queryKey: ['loading-plan-list-item', id] as const,
    queryFn: async (): Promise<LoadingPlanListItem | null> => {
      const { data } = await axiosInstance.get<unknown>(`/api/v1/loading-plans/${id}`);
      const parsed = planDetailApiResponseSchema.safeParse(data);
      if (!parsed.success) {
        console.error('[useLoadingPlanListItem] parse error', parsed.error);
        return null;
      }
      const d = parsed.data.data;
      return fromApiPlanListItem({
        id: d.id,
        planName: d.planName,
        vehicleId: d.vehicleId ?? '',
        vehicle: d.vehicle,
        fillRate: d.fillRate,
        volumeFillRate: d.volumeFillRate,
        optimizationStatus: d.optimizationStatus,
        itemCount: d.itemCount,
        totalWeight: d.totalWeight,
        createdAt: d.createdAt,
        plannedAt: d.plannedAt,
        planCode: d.planCode,
        status: d.status,
      });
    },
    enabled: Boolean(id),
    staleTime: 5 * 60 * 1000,
  });
}

// ─── Delete mutation ───────────────────────────────────────────────────────────

interface ProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
}

export function useDeleteLoadingPlan() {
  const queryClient = useQueryClient();
  return useMutation<void, AxiosError<ProblemDetails>, string>({
    mutationFn: (id) => axiosInstance.delete(`/api/v1/loading-plans/${id}`).then(() => undefined),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['loading-plan-list'] });
      void queryClient.invalidateQueries({ queryKey: ['loading-plan-list-item'] });
      toast.success('Yükleme planı silindi.', { position: 'bottom-right' });
    },
    onError: (error) => {
      const status = error.response?.status;
      const detail = error.response?.data?.detail;
      if (status === 404) {
        toast.error('Plan bulunamadı.', { position: 'bottom-right' });
        return;
      }
      toast.error(detail ?? 'Plan silinemedi. Lütfen tekrar deneyin.', {
        position: 'bottom-right',
      });
    },
  });
}

// ─── Rename mutation ───────────────────────────────────────────────────────────

export function useRenameLoadingPlan() {
  const queryClient = useQueryClient();
  return useMutation<void, AxiosError<ProblemDetails>, { id: string; planName: string }>({
    mutationFn: ({ id, planName }) =>
      axiosInstance.patch(`/api/v1/loading-plans/${id}`, { planName }).then(() => undefined),
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: ['loading-plan-list'] });
      void queryClient.invalidateQueries({ queryKey: ['loading-plan-list-item', id] });
      toast.success('Plan adı güncellendi.', { position: 'bottom-right' });
    },
    onError: (error) => {
      const status = error.response?.status;
      const detail = error.response?.data?.detail;
      if (status === 404) {
        toast.error('Plan bulunamadı.', { position: 'bottom-right' });
        return;
      }
      toast.error(detail ?? 'Plan adı güncellenemedi.', { position: 'bottom-right' });
    },
  });
}

// ─── Mock data (geçici — gerçek API bağlandığında silinecek) ──────────────────

const MOCK_LOADING_PLANS: LoadingPlanListItem[] = [
  {
    id: 'a1b2c3d4-0001-0000-0000-000000000001',
    planCode: 'PLN-2026-001',
    planName: 'İstanbul - Ankara Kargo Sevkiyatı',
    vehicleId: 'v0000001-0000-0000-0000-000000000001',
    vehicleName: 'Mercedes Actros 2548',
    vehiclePlate: '34 ABC 001',
    createdAt: '2026-05-01T08:00:00.000Z',
    plannedAt: '2026-05-05T06:00:00.000Z',
    status: 'aktif',
    productCount: 42,
    totalWeightKg: 14800,
    vehicleCapacityKg: 18000,
    fillPercentage: 82,
    volumeFillPercentage: 78,
    interiorWidthM: 248,
    interiorHeightM: 270,
    interiorDepthM: 1360,
  },
  {
    id: 'a1b2c3d4-0002-0000-0000-000000000002',
    planCode: 'PLN-2026-002',
    planName: 'İzmir Liman Çıkış Yüklemesi — Hazmat Dahil',
    vehicleId: 'v0000002-0000-0000-0000-000000000002',
    vehicleName: 'Volvo FH 500',
    vehiclePlate: '35 XYZ 999',
    createdAt: '2026-05-02T09:30:00.000Z',
    plannedAt: '2026-05-06T07:00:00.000Z',
    status: 'aktif',
    productCount: 18,
    totalWeightKg: 19200,
    vehicleCapacityKg: 19000,
    fillPercentage: 101,
    volumeFillPercentage: 97,
    interiorWidthM: 248,
    interiorHeightM: 270,
    interiorDepthM: 1360,
  },
  {
    id: 'a1b2c3d4-0003-0000-0000-000000000003',
    planCode: 'PLN-2026-003',
    planName: 'Bursa - Eskişehir Beyaz Eşya',
    vehicleId: 'v0000003-0000-0000-0000-000000000003',
    vehicleName: 'MAN TGX 18.480',
    vehiclePlate: '16 MAN 316',
    createdAt: '2026-05-03T11:00:00.000Z',
    plannedAt: '2026-05-07T08:00:00.000Z',
    status: 'tamamlandi',
    productCount: 30,
    totalWeightKg: 15900,
    vehicleCapacityKg: 20000,
    fillPercentage: 87,
    volumeFillPercentage: 91,
    interiorWidthM: 248,
    interiorHeightM: 270,
    interiorDepthM: 1360,
  },
  {
    id: 'a1b2c3d4-0004-0000-0000-000000000004',
    planCode: 'PLN-2026-004',
    planName: 'Adana Tekstil İhracatı',
    vehicleId: 'v0000004-0000-0000-0000-000000000004',
    vehicleName: 'Scania R 500',
    vehiclePlate: '01 SCA 500',
    createdAt: '2026-05-04T14:00:00.000Z',
    plannedAt: '2026-05-08T05:00:00.000Z',
    status: 'taslak',
    productCount: 55,
    totalWeightKg: 8200,
    vehicleCapacityKg: 22000,
    fillPercentage: 37,
    volumeFillPercentage: 44,
    interiorWidthM: 248,
    interiorHeightM: 270,
    interiorDepthM: 1360,
  },
  {
    id: 'a1b2c3d4-0005-0000-0000-000000000005',
    planCode: 'PLN-2026-005',
    planName: 'Ankara Gıda Dağıtımı — Soğuk Zincir',
    vehicleId: 'v0000005-0000-0000-0000-000000000005',
    vehicleName: 'Iveco S-Way 480',
    vehiclePlate: '06 IVC 480',
    createdAt: '2026-05-05T07:00:00.000Z',
    plannedAt: '2026-05-09T04:00:00.000Z',
    status: 'aktif',
    productCount: 120,
    totalWeightKg: 17500,
    vehicleCapacityKg: 18000,
    fillPercentage: 97,
    volumeFillPercentage: 94,
    interiorWidthM: 248,
    interiorHeightM: 270,
    interiorDepthM: 1360,
  },
  {
    id: 'a1b2c3d4-0006-0000-0000-000000000006',
    planCode: 'PLN-2026-006',
    planName: 'Trabzon Doğu Anadolu Sevkiyatı',
    vehicleId: 'v0000006-0000-0000-0000-000000000006',
    vehicleName: 'DAF XF 530',
    vehiclePlate: '61 DAF 530',
    createdAt: '2026-05-06T10:00:00.000Z',
    plannedAt: '2026-05-10T06:00:00.000Z',
    status: 'taslak',
    productCount: 8,
    totalWeightKg: 4100,
    vehicleCapacityKg: 20000,
    fillPercentage: 20,
    volumeFillPercentage: 18,
    interiorWidthM: 248,
    interiorHeightM: 270,
    interiorDepthM: 1360,
  },
];

// ─── Mock list hook (geçici) ──────────────────────────────────────────────────

function applyMockFilters(
  plans: LoadingPlanListItem[],
  filters?: LoadingPlanListFilters,
): LoadingPlanListItem[] {
  let result = [...plans];
  if (filters?.search && filters.search.length >= 2) {
    const q = filters.search.toLowerCase();
    result = result.filter(
      (p) =>
        p.planName.toLowerCase().includes(q) ||
        (p.vehiclePlate ?? '').toLowerCase().includes(q) ||
        p.vehicleName.toLowerCase().includes(q),
    );
  }
  if (filters?.plate && filters.plate.length >= 2) {
    const q = filters.plate.toLowerCase();
    result = result.filter((p) => (p.vehiclePlate ?? '').toLowerCase().includes(q));
  }
  if (filters?.vehicleNames && filters.vehicleNames.length > 0) {
    result = result.filter((p) => filters.vehicleNames!.includes(p.vehicleName));
  }
  if (filters?.dateFrom) {
    const from = new Date(filters.dateFrom).getTime();
    result = result.filter((p) => new Date(p.plannedAt ?? p.createdAt).getTime() >= from);
  }
  if (filters?.dateTo) {
    const to = new Date(filters.dateTo);
    to.setHours(23, 59, 59, 999);
    result = result.filter((p) => new Date(p.plannedAt ?? p.createdAt).getTime() <= to.getTime());
  }
  if (filters?.status) {
    result = result.filter((p) => p.status === filters.status);
  }
  return result;
}

// ─── Mock product groups (geçici) ─────────────────────────────────────────────

const MOCK_PLAN_PRODUCTS: Record<string, PlanProductGroup[]> = {
  'a1b2c3d4-0001-0000-0000-000000000001': [
    {
      id: 'GRP-IST-001',
      name: 'Elektronik',
      color: '#3b82f6',
      products: [
        {
          id: 'pd-001-001',
          name: 'Dizüstü Bilgisayar HP ProBook 450 G10',
          quantity: 12,
          unitWeightKg: 1.9,
          layerCount: 2,
          constraints: ['fragile', 'no_rotate'],
        },
        {
          id: 'pd-001-002',
          name: 'Monitör Dell 27" 4K USB-C',
          quantity: 6,
          unitWeightKg: 4.5,
          layerCount: 1,
          constraints: ['fragile'],
        },
        {
          id: 'pd-001-003',
          name: 'Klavye + Mouse Seti Logitech MX',
          quantity: 24,
          unitWeightKg: 0.4,
          layerCount: 3,
          constraints: [],
        },
      ],
    },
    {
      id: 'GRP-IST-002',
      name: 'Ofis Malzemeleri',
      color: '#10b981',
      products: [
        {
          id: 'pd-001-004',
          name: 'A4 Kağıt Koli (5 Paket × 500 Yaprak)',
          quantity: 20,
          unitWeightKg: 12.5,
          layerCount: 4,
          constraints: ['bottom_only'],
        },
        {
          id: 'pd-001-005',
          name: 'Arşiv Klasörü Çift Mekanizmalı',
          quantity: 80,
          unitWeightKg: 0.3,
          layerCount: 5,
          constraints: [],
        },
        {
          id: 'pd-001-006',
          name: 'Plastik Dosya — Şeffaf A4',
          quantity: 120,
          unitWeightKg: 0.05,
          layerCount: 6,
          constraints: [],
        },
      ],
    },
  ],
  'a1b2c3d4-0002-0000-0000-000000000002': [
    {
      id: 'GRP-IZM-001',
      name: 'Kimyasal Ürünler',
      color: '#f59e0b',
      products: [
        {
          id: 'pd-002-001',
          name: 'Endüstriyel Yağlayıcı — 20 L Varil',
          quantity: 8,
          unitWeightKg: 18.0,
          layerCount: 1,
          constraints: ['bottom_only', 'hazmat', 'liquid'],
        },
        {
          id: 'pd-002-002',
          name: 'Boya Solüsyonu Renksiz 10 L',
          quantity: 12,
          unitWeightKg: 11.2,
          layerCount: 1,
          constraints: ['hazmat', 'liquid'],
        },
      ],
    },
    {
      id: 'GRP-IZM-002',
      name: 'Metal Parçalar',
      color: '#6b7280',
      products: [
        {
          id: 'pd-002-003',
          name: 'Çelik Flanş DN150 PN16',
          quantity: 24,
          unitWeightKg: 8.4,
          layerCount: 2,
          constraints: ['heavy_side'],
        },
        {
          id: 'pd-002-004',
          name: 'Alüminyum Profil 6060 T5 — 3m',
          quantity: 30,
          unitWeightKg: 6.1,
          layerCount: 1,
          constraints: ['no_rotate'],
        },
      ],
    },
  ],
  'a1b2c3d4-0003-0000-0000-000000000003': [
    {
      id: 'GRP-BUR-001',
      name: 'Büyük Ev Aletleri',
      color: '#8b5cf6',
      products: [
        {
          id: 'pd-003-001',
          name: 'Bulaşık Makinesi Bosch Serie 6 — 60cm',
          quantity: 6,
          unitWeightKg: 52.0,
          layerCount: 1,
          constraints: ['fragile', 'bottom_only'],
        },
        {
          id: 'pd-003-002',
          name: 'Çamaşır Makinesi Arçelik 9 kg',
          quantity: 8,
          unitWeightKg: 70.0,
          layerCount: 1,
          constraints: ['fragile', 'bottom_only'],
        },
        {
          id: 'pd-003-003',
          name: 'Kurutma Makinesi Beko 7 kg',
          quantity: 4,
          unitWeightKg: 40.0,
          layerCount: 1,
          constraints: ['fragile'],
        },
        {
          id: 'pd-003-004',
          name: 'Buzdolabı No-Frost 450L',
          quantity: 2,
          unitWeightKg: 85.0,
          layerCount: 1,
          constraints: ['fragile', 'bottom_only', 'no_rotate'],
        },
      ],
    },
    {
      id: 'GRP-BUR-002',
      name: 'Küçük Ev Aletleri',
      color: '#ec4899',
      products: [
        {
          id: 'pd-003-005',
          name: 'Mikser Standlı KitchenAid Artisan',
          quantity: 10,
          unitWeightKg: 11.0,
          layerCount: 2,
          constraints: ['fragile'],
        },
        {
          id: 'pd-003-006',
          name: 'Kahve Makinesi Espresso Philips',
          quantity: 12,
          unitWeightKg: 5.5,
          layerCount: 2,
          constraints: ['fragile'],
        },
        {
          id: 'pd-003-007',
          name: 'Tost Makinesi Tefal — 3in1',
          quantity: 18,
          unitWeightKg: 1.8,
          layerCount: 3,
          constraints: [],
        },
        {
          id: 'pd-003-008',
          name: 'Su Isıtıcısı 1.7L İnox',
          quantity: 20,
          unitWeightKg: 0.9,
          layerCount: 4,
          constraints: [],
        },
      ],
    },
  ],
  'a1b2c3d4-0004-0000-0000-000000000004': [
    {
      id: 'GRP-ADA-001',
      name: 'Kot Kumaş Ruloları',
      color: '#1d4ed8',
      products: [
        {
          id: 'pd-004-001',
          name: 'Kot Kumaş Rulo Lacivert — 100m',
          quantity: 15,
          unitWeightKg: 28.0,
          layerCount: 1,
          constraints: ['no_rotate'],
        },
        {
          id: 'pd-004-002',
          name: 'Kot Kumaş Rulo Siyah — 100m',
          quantity: 12,
          unitWeightKg: 28.0,
          layerCount: 1,
          constraints: ['no_rotate'],
        },
        {
          id: 'pd-004-003',
          name: 'Streç Kumaş Beyaz — 50m',
          quantity: 20,
          unitWeightKg: 8.0,
          layerCount: 2,
          constraints: [],
        },
        {
          id: 'pd-004-004',
          name: 'Pamuk Krep Bej — 50m',
          quantity: 8,
          unitWeightKg: 5.5,
          layerCount: 2,
          constraints: [],
        },
      ],
    },
    {
      id: 'GRP-ADA-002',
      name: 'Hazır Giyim',
      color: '#059669',
      products: [
        {
          id: 'pd-004-005',
          name: 'Erkek Gömlek Koli (24 adet) XL',
          quantity: 12,
          unitWeightKg: 3.2,
          layerCount: 4,
          constraints: [],
        },
        {
          id: 'pd-004-006',
          name: 'Kadın Bluz Koli (24 adet) M',
          quantity: 18,
          unitWeightKg: 2.8,
          layerCount: 4,
          constraints: [],
        },
        {
          id: 'pd-004-007',
          name: 'Çocuk T-Shirt Koli (48 adet)',
          quantity: 10,
          unitWeightKg: 2.2,
          layerCount: 5,
          constraints: [],
        },
      ],
    },
  ],
  'a1b2c3d4-0005-0000-0000-000000000005': [
    {
      id: 'GRP-ANK-001',
      name: 'Süt Ürünleri',
      color: '#fbbf24',
      products: [
        {
          id: 'pd-005-001',
          name: 'UHT Süt 1L Tam Yağlı (12li koli)',
          quantity: 40,
          unitWeightKg: 12.8,
          layerCount: 3,
          constraints: ['liquid'],
        },
        {
          id: 'pd-005-002',
          name: 'Ayran 200ml Cam Şişe (24li koli)',
          quantity: 30,
          unitWeightKg: 5.4,
          layerCount: 3,
          constraints: ['fragile', 'liquid'],
        },
        {
          id: 'pd-005-003',
          name: 'Peynir Beyaz 500g Kapalı Kova',
          quantity: 25,
          unitWeightKg: 0.52,
          layerCount: 4,
          constraints: [],
        },
        {
          id: 'pd-005-004',
          name: 'Tereyağı 250g (24li koli)',
          quantity: 20,
          unitWeightKg: 6.2,
          layerCount: 3,
          constraints: [],
        },
        {
          id: 'pd-005-005',
          name: 'Yoğurt 1kg Tam Yağlı (6lı koli)',
          quantity: 35,
          unitWeightKg: 6.1,
          layerCount: 3,
          constraints: [],
        },
      ],
    },
    {
      id: 'GRP-ANK-002',
      name: 'Kuru Gıda',
      color: '#d97706',
      products: [
        {
          id: 'pd-005-006',
          name: 'Pirinç Baldo 5kg Torba (5li koli)',
          quantity: 50,
          unitWeightKg: 25.5,
          layerCount: 2,
          constraints: ['bottom_only', 'heavy_side'],
        },
        {
          id: 'pd-005-007',
          name: 'Makarna Spagetti 500g (24lü koli)',
          quantity: 45,
          unitWeightKg: 12.3,
          layerCount: 4,
          constraints: [],
        },
        {
          id: 'pd-005-008',
          name: 'Un 1kg (12li koli)',
          quantity: 38,
          unitWeightKg: 12.1,
          layerCount: 3,
          constraints: [],
        },
        {
          id: 'pd-005-009',
          name: 'Şeker 1kg Kesme (10lu koli)',
          quantity: 28,
          unitWeightKg: 10.2,
          layerCount: 4,
          constraints: [],
        },
        {
          id: 'pd-005-010',
          name: 'Zeytinyağı 1L Cam Şişe (6lı koli)',
          quantity: 22,
          unitWeightKg: 6.5,
          layerCount: 2,
          constraints: ['fragile', 'liquid'],
        },
        {
          id: 'pd-005-011',
          name: 'Tuz Rafine 1kg (12li koli)',
          quantity: 18,
          unitWeightKg: 12.0,
          layerCount: 4,
          constraints: [],
        },
        {
          id: 'pd-005-012',
          name: 'Nohut 1kg (10lu koli)',
          quantity: 15,
          unitWeightKg: 10.3,
          layerCount: 3,
          constraints: [],
        },
      ],
    },
  ],
  'a1b2c3d4-0006-0000-0000-000000000006': [
    {
      id: 'GRP-TRZ-001',
      name: 'İnşaat Malzemeleri',
      color: '#92400e',
      products: [
        {
          id: 'pd-006-001',
          name: 'Seramik Yer Karosu 60×60 (10lu koli)',
          quantity: 20,
          unitWeightKg: 22.0,
          layerCount: 2,
          constraints: ['fragile', 'bottom_only'],
        },
        {
          id: 'pd-006-002',
          name: 'Duvar Boyası Mat Beyaz 15L',
          quantity: 12,
          unitWeightKg: 18.5,
          layerCount: 2,
          constraints: ['liquid', 'bottom_only'],
        },
        {
          id: 'pd-006-003',
          name: 'Alçı Torba 25kg',
          quantity: 16,
          unitWeightKg: 25.0,
          layerCount: 1,
          constraints: ['bottom_only', 'heavy_side'],
        },
      ],
    },
  ],
};

export function useLoadingPlanProducts(planId: string) {
  return useQuery({
    queryKey: ['loading-plan-products', planId] as const,
    queryFn: (): PlanProductGroup[] => {
      const groups = MOCK_PLAN_PRODUCTS[planId];
      if (groups) return z.array(planProductGroupSchema).parse(groups);
      return [];
    },
    enabled: Boolean(planId),
    staleTime: 5 * 60 * 1000,
  });
}
