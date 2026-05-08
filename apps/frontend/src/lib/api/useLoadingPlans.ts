import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import {
  loadingPlanSchema,
  loadingPlanListItemSchema,
  planProductGroupSchema,
  type LoadingPlanListItem,
  type PlanProductGroup,
} from '@/lib/types/loadingPlan';
import { apiFetch } from './fetcher';

interface LoadingPlanFilters {
  vehicleId?: string;
  page?: number;
}

export function useLoadingPlans(filters?: LoadingPlanFilters) {
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

// ─── List view mock data ───────────────────────────────────────────────────────

const MOCK_PLANS: LoadingPlanListItem[] = [
  {
    id: 'a1b2c3d4-0001-0000-0000-000000000001',
    planCode: 'PLN-2025-001',
    planName: 'İstanbul → Ankara Sevkiyatı',
    vehicleId: 'v0000000-0001-0000-0000-000000000001',
    vehicleName: 'Volvo FH16',
    vehiclePlate: '34 ABC 001',
    createdAt: '2025-01-02T00:00:00.000Z',
    plannedAt: '2025-01-10T00:00:00.000Z',
    status: 'tamamlandi',
    productCount: 18,
    totalWeightKg: 19400,
    vehicleCapacityKg: 21300,
    fillPercentage: 91,
    volumeFillPercentage: 87,
    interiorWidthM: 2.47,
    interiorHeightM: 2.72,
    interiorDepthM: 13.62,
  },
  {
    id: 'a1b2c3d4-0002-0000-0000-000000000002',
    planCode: 'PLN-2025-002',
    planName: 'İzmir Liman Çıkış Konteyneri',
    vehicleId: 'v0000000-0002-0000-0000-000000000002',
    vehicleName: '40ft Standart',
    vehiclePlate: '35 DEF 002',
    createdAt: '2025-01-08T00:00:00.000Z',
    plannedAt: '2025-01-15T00:00:00.000Z',
    status: 'tamamlandi',
    productCount: 32,
    totalWeightKg: 22100,
    vehicleCapacityKg: 26600,
    fillPercentage: 83,
    volumeFillPercentage: 88,
    interiorWidthM: 2.35,
    interiorHeightM: 2.39,
    interiorDepthM: 12.03,
  },
  {
    id: 'a1b2c3d4-0003-0000-0000-000000000003',
    planCode: 'PLN-2025-003',
    planName: 'Bursa Fabrika Tedarik Planı',
    vehicleId: 'v0000000-0003-0000-0000-000000000003',
    vehicleName: 'Mercedes Actros',
    vehiclePlate: '16 GHI 003',
    createdAt: '2025-02-15T00:00:00.000Z',
    plannedAt: '2025-02-20T00:00:00.000Z',
    status: 'tamamlandi',
    productCount: 11,
    totalWeightKg: 9800,
    vehicleCapacityKg: 12500,
    fillPercentage: 78,
    volumeFillPercentage: 72,
    interiorWidthM: 2.45,
    interiorHeightM: 2.7,
    interiorDepthM: 13.6,
  },
  {
    id: 'a1b2c3d4-0004-0000-0000-000000000004',
    planCode: 'PLN-2025-004',
    planName: 'Adana → Mersin Rota Planı',
    vehicleId: 'v0000000-0004-0000-0000-000000000004',
    vehicleName: 'DAF XF 530',
    vehiclePlate: '01 JKL 004',
    createdAt: '2025-03-01T00:00:00.000Z',
    plannedAt: '2025-03-08T00:00:00.000Z',
    status: 'tamamlandi',
    productCount: 24,
    totalWeightKg: 21500,
    vehicleCapacityKg: 24100,
    fillPercentage: 89,
    volumeFillPercentage: 85,
    interiorWidthM: 2.47,
    interiorHeightM: 2.72,
    interiorDepthM: 13.62,
  },
  {
    id: 'a1b2c3d4-0005-0000-0000-000000000005',
    planCode: 'PLN-2025-005',
    planName: 'Ankara Depo Taşıma',
    vehicleId: 'v0000000-0005-0000-0000-000000000005',
    vehicleName: 'Schmitz Cargobull',
    vehiclePlate: '06 MNO 005',
    createdAt: '2025-03-12T00:00:00.000Z',
    plannedAt: '2025-03-18T00:00:00.000Z',
    status: 'iptal',
    productCount: 7,
    totalWeightKg: 5200,
    vehicleCapacityKg: 27300,
    fillPercentage: 19,
    volumeFillPercentage: 15,
    interiorWidthM: 2.47,
    interiorHeightM: 2.72,
    interiorDepthM: 13.62,
  },
  {
    id: 'a1b2c3d4-0006-0000-0000-000000000006',
    planCode: 'PLN-2025-006',
    planName: 'İstanbul Avrupa Yakası Dağıtım',
    vehicleId: 'v0000000-0006-0000-0000-000000000006',
    vehicleName: 'MAN TGX 26.470',
    vehiclePlate: '34 PRS 006',
    createdAt: '2025-03-20T00:00:00.000Z',
    plannedAt: '2025-03-28T00:00:00.000Z',
    status: 'tamamlandi',
    productCount: 15,
    totalWeightKg: 12600,
    vehicleCapacityKg: 15000,
    fillPercentage: 84,
    volumeFillPercentage: 80,
    interiorWidthM: 2.46,
    interiorHeightM: 2.7,
    interiorDepthM: 13.6,
  },
  {
    id: 'a1b2c3d4-0007-0000-0000-000000000007',
    planCode: 'PLN-2025-007',
    planName: 'Tekstil İhracat Konteyneri',
    vehicleId: 'v0000000-0007-0000-0000-000000000007',
    vehicleName: '40ft High Cube',
    vehiclePlate: '34 TUV 007',
    createdAt: '2025-04-02T00:00:00.000Z',
    plannedAt: '2025-04-12T00:00:00.000Z',
    status: 'tamamlandi',
    productCount: 41,
    totalWeightKg: 18900,
    vehicleCapacityKg: 26600,
    fillPercentage: 71,
    volumeFillPercentage: 76,
    interiorWidthM: 2.35,
    interiorHeightM: 2.7,
    interiorDepthM: 12.03,
  },
  {
    id: 'a1b2c3d4-0008-0000-0000-000000000008',
    planCode: 'PLN-2025-008',
    planName: 'Karadeniz Bölge Sevkiyatı',
    vehicleId: 'v0000000-0008-0000-0000-000000000008',
    vehicleName: 'Scania R500',
    vehiclePlate: '61 WXY 008',
    createdAt: '2025-04-10T00:00:00.000Z',
    plannedAt: '2025-04-17T00:00:00.000Z',
    status: 'aktif',
    productCount: 29,
    totalWeightKg: 20800,
    vehicleCapacityKg: 24150,
    fillPercentage: 86,
    volumeFillPercentage: 102,
    interiorWidthM: 2.45,
    interiorHeightM: 2.72,
    interiorDepthM: 13.6,
  },
  {
    id: 'a1b2c3d4-0009-0000-0000-000000000009',
    planCode: 'PLN-2025-009',
    planName: 'Ege Bölgesi Gıda Dağıtımı',
    vehicleId: 'v0000000-0009-0000-0000-000000000009',
    vehicleName: 'Ford Cargo 3530',
    vehiclePlate: '35 ZAB 009',
    createdAt: '2025-04-14T00:00:00.000Z',
    plannedAt: '2025-04-21T00:00:00.000Z',
    status: 'aktif',
    productCount: 9,
    totalWeightKg: 7400,
    vehicleCapacityKg: 10000,
    fillPercentage: 74,
    volumeFillPercentage: 70,
    interiorWidthM: 2.4,
    interiorHeightM: 2.6,
    interiorDepthM: 8.5,
  },
  {
    id: 'a1b2c3d4-0010-0000-0000-000000000010',
    planCode: 'PLN-2025-010',
    planName: 'Otomotiv Parça İhracatı',
    vehicleId: 'v0000000-0010-0000-0000-000000000010',
    vehicleName: 'Krone Mega Liner',
    vehiclePlate: '34 CDE 010',
    createdAt: '2025-04-18T00:00:00.000Z',
    plannedAt: '2025-04-26T00:00:00.000Z',
    status: 'taslak',
    productCount: 13,
    totalWeightKg: 11200,
    vehicleCapacityKg: 28000,
    fillPercentage: 40,
    volumeFillPercentage: 45,
    interiorWidthM: 2.48,
    interiorHeightM: 3.0,
    interiorDepthM: 13.62,
  },
  {
    id: 'a1b2c3d4-0011-0000-0000-000000000011',
    planCode: 'PLN-2025-011',
    planName: 'Ankara Lojistik Merkez',
    vehicleId: 'v0000000-0001-0000-0000-000000000001',
    vehicleName: 'Volvo FH16',
    vehiclePlate: '34 ABC 001',
    createdAt: '2025-04-22T00:00:00.000Z',
    plannedAt: '2025-05-01T00:00:00.000Z',
    status: 'taslak',
    productCount: 20,
    totalWeightKg: 14500,
    vehicleCapacityKg: 21300,
    fillPercentage: 68,
    volumeFillPercentage: 65,
    interiorWidthM: 2.47,
    interiorHeightM: 2.72,
    interiorDepthM: 13.62,
  },
  {
    id: 'a1b2c3d4-0012-0000-0000-000000000012',
    planCode: 'PLN-2025-012',
    planName: 'Konya Sanayi Teslimatı',
    vehicleId: 'v0000000-0003-0000-0000-000000000003',
    vehicleName: 'Mercedes Actros',
    vehiclePlate: '16 GHI 003',
    createdAt: '2025-04-25T00:00:00.000Z',
    plannedAt: '2025-05-05T00:00:00.000Z',
    status: 'taslak',
    productCount: 8,
    totalWeightKg: 6800,
    vehicleCapacityKg: 12500,
    fillPercentage: 54,
    volumeFillPercentage: 58,
    interiorWidthM: 2.45,
    interiorHeightM: 2.7,
    interiorDepthM: 13.6,
  },
  {
    id: 'a1b2c3d4-0013-0000-0000-000000000013',
    planCode: 'PLN-2025-013',
    planName: 'İstanbul Anadolu Yakası Dağıtım',
    vehicleId: 'v0000000-0006-0000-0000-000000000006',
    vehicleName: 'MAN TGX 26.470',
    vehiclePlate: '34 PRS 006',
    createdAt: '2025-04-28T00:00:00.000Z',
    plannedAt: '2025-05-08T00:00:00.000Z',
    status: 'taslak',
    productCount: 22,
    totalWeightKg: 9200,
    vehicleCapacityKg: 15000,
    fillPercentage: 61,
    volumeFillPercentage: 62,
    interiorWidthM: 2.46,
    interiorHeightM: 2.7,
    interiorDepthM: 13.6,
  },
  {
    id: 'a1b2c3d4-0014-0000-0000-000000000014',
    planCode: 'PLN-2025-014',
    planName: 'Gaziantep Tekstil Sevkiyatı',
    vehicleId: 'v0000000-0007-0000-0000-000000000007',
    vehicleName: '40ft High Cube',
    vehiclePlate: '34 TUV 007',
    createdAt: '2025-05-01T00:00:00.000Z',
    plannedAt: '2025-05-10T00:00:00.000Z',
    status: 'taslak',
    productCount: 35,
    totalWeightKg: 16100,
    vehicleCapacityKg: 26600,
    fillPercentage: 60,
    volumeFillPercentage: 67,
    interiorWidthM: 2.35,
    interiorHeightM: 2.7,
    interiorDepthM: 12.03,
  },
  {
    id: 'a1b2c3d4-0015-0000-0000-000000000015',
    planCode: 'PLN-2025-015',
    planName: 'Mersin Liman Çıkış',
    vehicleId: 'v0000000-0010-0000-0000-000000000010',
    vehicleName: 'Krone Mega Liner',
    vehiclePlate: '34 CDE 010',
    createdAt: '2025-05-03T00:00:00.000Z',
    plannedAt: '2025-05-15T00:00:00.000Z',
    status: 'taslak',
    productCount: 28,
    totalWeightKg: 19600,
    vehicleCapacityKg: 28000,
    fillPercentage: 70,
    volumeFillPercentage: 75,
    interiorWidthM: 2.48,
    interiorHeightM: 3.0,
    interiorDepthM: 13.62,
  },
];

export interface LoadingPlanListFilters {
  search?: string;
  status?: string;
  plate?: string;
  vehicleNames?: string[];
  dateFrom?: string;
  dateTo?: string;
}

function applyFilters(
  plans: LoadingPlanListItem[],
  filters: LoadingPlanListFilters,
): LoadingPlanListItem[] {
  return plans.filter((plan) => {
    if (filters.status && filters.status !== 'all') {
      if (plan.status !== filters.status) return false;
    }
    if (filters.search && filters.search.length >= 2) {
      const q = filters.search.toLowerCase();
      const matches =
        plan.planName.toLowerCase().includes(q) ||
        plan.planCode.toLowerCase().includes(q) ||
        plan.vehicleName.toLowerCase().includes(q) ||
        (plan.vehiclePlate?.toLowerCase().includes(q) ?? false);
      if (!matches) return false;
    }
    if (filters.plate && filters.plate.length >= 2) {
      const p = filters.plate.toLowerCase();
      if (!(plan.vehiclePlate?.toLowerCase().includes(p) ?? false)) return false;
    }
    if (filters.vehicleNames && filters.vehicleNames.length > 0) {
      if (!filters.vehicleNames.includes(plan.vehicleName)) return false;
    }
    if (filters.dateFrom) {
      const from = new Date(filters.dateFrom);
      const planned = plan.plannedAt ? new Date(plan.plannedAt) : null;
      if (!planned || planned < from) return false;
    }
    if (filters.dateTo) {
      const to = new Date(filters.dateTo);
      to.setHours(23, 59, 59, 999);
      const planned = plan.plannedAt ? new Date(plan.plannedAt) : null;
      if (!planned || planned > to) return false;
    }
    return true;
  });
}

export interface LoadingPlanListPage {
  items: LoadingPlanListItem[];
  totalCount: number;
  allVehicleNames: string[];
}

export function useLoadingPlanListItem(id: string) {
  return useQuery({
    queryKey: ['loading-plan-list-item', id] as const,
    queryFn: (): LoadingPlanListItem | null => {
      const all = z.array(loadingPlanListItemSchema).parse(MOCK_PLANS);
      return all.find((p) => p.id === id) ?? null;
    },
    enabled: Boolean(id),
    staleTime: 5 * 60 * 1000,
  });
}

export function useLoadingPlanList(filters?: LoadingPlanListFilters, page = 1, pageSize = 10) {
  return useQuery({
    queryKey: ['loading-plan-list', filters, page, pageSize] as const,
    queryFn: (): LoadingPlanListPage => {
      const all = z.array(loadingPlanListItemSchema).parse(MOCK_PLANS);
      const filtered = applyFilters(all, filters ?? {});
      const start = (page - 1) * pageSize;
      return {
        items: filtered.slice(start, start + pageSize),
        totalCount: filtered.length,
        allVehicleNames: [...new Set(all.map((p) => p.vehicleName))].sort(),
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ─── Mock product groups per plan ─────────────────────────────────────────────

const MOCK_PLAN_PRODUCTS: Record<string, PlanProductGroup[]> = {
  'a1b2c3d4-0001-0000-0000-000000000001': [
    {
      id: 'GRP-A001',
      name: 'Elektronik Ekipman',
      color: '#3b82f6',
      products: [
        {
          id: 'p0000001-0000-0000-0000-000000000001',
          name: 'Monitör 27" 4K IPS Panel',
          quantity: 4,
          unitWeightKg: 8.2,
          layerCount: 2,
          constraints: ['fragile'],
        },
        {
          id: 'p0000001-0000-0000-0000-000000000002',
          name: 'Dizüstü Bilgisayar Kasası',
          quantity: 6,
          unitWeightKg: 3.5,
          layerCount: 3,
          constraints: ['fragile', 'no_rotate'],
        },
        {
          id: 'p0000001-0000-0000-0000-000000000003',
          name: 'UPS Güç Kaynağı 1500VA',
          quantity: 2,
          unitWeightKg: 22.0,
          layerCount: 1,
          constraints: ['heavy_side'],
        },
        {
          id: 'p0000001-0000-0000-0000-000000000004',
          name: 'Sunucu Rack Ünitesi 2U',
          quantity: 1,
          unitWeightKg: 15.4,
          layerCount: 1,
          constraints: ['bottom_only', 'fragile'],
        },
        {
          id: 'p0000001-0000-0000-0000-000000000005',
          name: 'Ağ Anahtarı 48 Port',
          quantity: 3,
          unitWeightKg: 4.8,
          layerCount: 2,
          constraints: [],
        },
      ],
    },
    {
      id: 'GRP-B001',
      name: 'Ambalaj Malzemeleri',
      color: '#22c55e',
      products: [
        {
          id: 'p0000001-0000-0000-0000-000000000006',
          name: 'Karton Koli 60x40x40 cm',
          quantity: 30,
          unitWeightKg: 1.2,
          layerCount: 5,
          constraints: [],
        },
        {
          id: 'p0000001-0000-0000-0000-000000000007',
          name: 'Streç Film Rulosu 23 Mikron',
          quantity: 12,
          unitWeightKg: 2.1,
          layerCount: 4,
          constraints: [],
        },
        {
          id: 'p0000001-0000-0000-0000-000000000008',
          name: 'Balonlu Naylon Rulo 100m',
          quantity: 8,
          unitWeightKg: 1.8,
          layerCount: 3,
          constraints: [],
        },
        {
          id: 'p0000001-0000-0000-0000-000000000009',
          name: 'Köpük Dolgu Malzemesi',
          quantity: 5,
          unitWeightKg: 0.9,
          layerCount: 6,
          constraints: [],
        },
        {
          id: 'p0000001-0000-0000-0000-000000000010',
          name: 'Ahşap Palet 120x80 cm',
          quantity: 10,
          unitWeightKg: 12.0,
          layerCount: 1,
          constraints: ['bottom_only'],
        },
        {
          id: 'p0000001-0000-0000-0000-000000000011',
          name: 'Plastik Sargı Bandı 50mm',
          quantity: 24,
          unitWeightKg: 0.5,
          layerCount: 8,
          constraints: [],
        },
        {
          id: 'p0000001-0000-0000-0000-000000000012',
          name: 'Etiket Dispenseri',
          quantity: 6,
          unitWeightKg: 0.3,
          layerCount: 5,
          constraints: [],
        },
        {
          id: 'p0000001-0000-0000-0000-000000000013',
          name: 'Bantlama Makinesi El Tipi',
          quantity: 4,
          unitWeightKg: 1.1,
          layerCount: 4,
          constraints: [],
        },
        {
          id: 'p0000001-0000-0000-0000-000000000014',
          name: 'Güçlü Ambalaj Bandı 48mm',
          quantity: 60,
          unitWeightKg: 0.2,
          layerCount: 10,
          constraints: [],
        },
        {
          id: 'p0000001-0000-0000-0000-000000000015',
          name: 'Köşe Koruyucu Profil Seti',
          quantity: 50,
          unitWeightKg: 0.1,
          layerCount: 12,
          constraints: [],
        },
        {
          id: 'p0000001-0000-0000-0000-000000000016',
          name: 'Kargo Bağ Kemeri 5m',
          quantity: 20,
          unitWeightKg: 0.6,
          layerCount: 6,
          constraints: [],
        },
        {
          id: 'p0000001-0000-0000-0000-000000000017',
          name: 'Şok Absorbe Ped Seti',
          quantity: 15,
          unitWeightKg: 0.4,
          layerCount: 8,
          constraints: [],
        },
        {
          id: 'p0000001-0000-0000-0000-000000000018',
          name: 'Nem Alıcı Paket 50gr x 100',
          quantity: 10,
          unitWeightKg: 5.0,
          layerCount: 5,
          constraints: [],
        },
        {
          id: 'p0000001-0000-0000-0000-000000000019',
          name: 'Lastik Tampon Profil',
          quantity: 8,
          unitWeightKg: 1.5,
          layerCount: 4,
          constraints: [],
        },
        {
          id: 'p0000001-0000-0000-0000-000000000020',
          name: 'Etiket Koruyucu Cep Seti',
          quantity: 100,
          unitWeightKg: 0.05,
          layerCount: 15,
          constraints: [],
        },
        {
          id: 'p0000001-0000-0000-0000-000000000021',
          name: 'Shrink Film 200x150 cm',
          quantity: 25,
          unitWeightKg: 1.3,
          layerCount: 5,
          constraints: [],
        },
        {
          id: 'p0000001-0000-0000-0000-000000000022',
          name: 'Kargoluk Zincir Kilit',
          quantity: 10,
          unitWeightKg: 0.8,
          layerCount: 4,
          constraints: [],
        },
        {
          id: 'p0000001-0000-0000-0000-000000000023',
          name: 'Vibrasyon Göstergesi Etiketi',
          quantity: 50,
          unitWeightKg: 0.01,
          layerCount: 20,
          constraints: [],
        },
      ],
    },
  ],
  'a1b2c3d4-0002-0000-0000-000000000002': [
    {
      id: 'GRP-A002',
      name: 'Kimyasal Ürünler',
      color: '#ef4444',
      products: [
        {
          id: 'p0000002-0000-0000-0000-000000000001',
          name: 'Endüstriyel Temizleyici 20L',
          quantity: 10,
          unitWeightKg: 22.0,
          layerCount: 1,
          constraints: ['hazmat', 'bottom_only'],
        },
        {
          id: 'p0000002-0000-0000-0000-000000000002',
          name: 'Solvent Bazlı Boya 5L',
          quantity: 8,
          unitWeightKg: 5.8,
          layerCount: 2,
          constraints: ['hazmat', 'liquid'],
        },
        {
          id: 'p0000002-0000-0000-0000-000000000003',
          name: 'Epoksi Reçine Kiti 2kg',
          quantity: 5,
          unitWeightKg: 2.2,
          layerCount: 3,
          constraints: ['hazmat'],
        },
      ],
    },
    {
      id: 'GRP-B002',
      name: 'Tekstil Ürünleri',
      color: '#f59e0b',
      products: [
        {
          id: 'p0000002-0000-0000-0000-000000000004',
          name: 'Pamuklu Kumaş Topu 50m Beyaz',
          quantity: 12,
          unitWeightKg: 18.0,
          layerCount: 2,
          constraints: [],
        },
        {
          id: 'p0000002-0000-0000-0000-000000000005',
          name: 'Polyester İplik Koni 1kg',
          quantity: 24,
          unitWeightKg: 1.0,
          layerCount: 4,
          constraints: [],
        },
        {
          id: 'p0000002-0000-0000-0000-000000000006',
          name: 'Denim Kumaş Balosu',
          quantity: 6,
          unitWeightKg: 45.0,
          layerCount: 1,
          constraints: ['heavy_side'],
        },
        {
          id: 'p0000002-0000-0000-0000-000000000007',
          name: 'Fermuarlı Çanta Kolisi 40 Adet',
          quantity: 3,
          unitWeightKg: 6.5,
          layerCount: 3,
          constraints: [],
        },
      ],
    },
  ],
  'a1b2c3d4-0008-0000-0000-000000000008': [
    {
      id: 'GRP-A008',
      name: 'Mobilya Grubu',
      color: '#8b5cf6',
      products: [
        {
          id: 'p0000008-0000-0000-0000-000000000001',
          name: 'Çalışma Masası Demonte 160x80 cm',
          quantity: 5,
          unitWeightKg: 32.0,
          layerCount: 1,
          constraints: ['fragile', 'bottom_only'],
        },
        {
          id: 'p0000008-0000-0000-0000-000000000002',
          name: 'Ofis Sandalyesi (Koli)',
          quantity: 8,
          unitWeightKg: 14.5,
          layerCount: 2,
          constraints: [],
        },
        {
          id: 'p0000008-0000-0000-0000-000000000003',
          name: 'Kitaplık Modülü 80x200 cm',
          quantity: 4,
          unitWeightKg: 28.0,
          layerCount: 1,
          constraints: ['fragile'],
        },
        {
          id: 'p0000008-0000-0000-0000-000000000004',
          name: 'Dolap Kapı Seti 60x200 cm',
          quantity: 10,
          unitWeightKg: 12.5,
          layerCount: 1,
          constraints: ['fragile', 'no_rotate'],
        },
        {
          id: 'p0000008-0000-0000-0000-000000000005',
          name: 'Konsol Masa Demonte',
          quantity: 3,
          unitWeightKg: 8.0,
          layerCount: 2,
          constraints: ['fragile'],
        },
      ],
    },
    {
      id: 'GRP-B008',
      name: 'Beyaz Eşya',
      color: '#06b6d4',
      products: [
        {
          id: 'p0000008-0000-0000-0000-000000000006',
          name: 'Çamaşır Makinesi 8kg A+++',
          quantity: 4,
          unitWeightKg: 68.0,
          layerCount: 1,
          constraints: ['bottom_only', 'heavy_side'],
        },
        {
          id: 'p0000008-0000-0000-0000-000000000007',
          name: 'Buzdolabı No-Frost 450L',
          quantity: 3,
          unitWeightKg: 82.0,
          layerCount: 1,
          constraints: ['bottom_only', 'no_rotate'],
        },
        {
          id: 'p0000008-0000-0000-0000-000000000008',
          name: 'Fırın Ankastre 60cm',
          quantity: 2,
          unitWeightKg: 35.0,
          layerCount: 1,
          constraints: ['fragile', 'bottom_only'],
        },
        {
          id: 'p0000008-0000-0000-0000-000000000009',
          name: 'Davlumbaz Duvar Tipi',
          quantity: 3,
          unitWeightKg: 12.0,
          layerCount: 2,
          constraints: ['fragile'],
        },
      ],
    },
    {
      id: 'GRP-C008',
      name: 'Aydınlatma',
      color: '#f59e0b',
      products: [
        {
          id: 'p0000008-0000-0000-0000-000000000010',
          name: 'LED Panel 60x60 cm 36W',
          quantity: 24,
          unitWeightKg: 1.8,
          layerCount: 4,
          constraints: ['fragile'],
        },
        {
          id: 'p0000008-0000-0000-0000-000000000011',
          name: 'Sarkıt Avize Cam Gövdeli',
          quantity: 6,
          unitWeightKg: 4.2,
          layerCount: 2,
          constraints: ['fragile', 'no_rotate'],
        },
        {
          id: 'p0000008-0000-0000-0000-000000000012',
          name: 'Aplik Duvar Lambası',
          quantity: 12,
          unitWeightKg: 1.1,
          layerCount: 4,
          constraints: ['fragile'],
        },
        {
          id: 'p0000008-0000-0000-0000-000000000013',
          name: 'LED Şerit Seti 5m 12V',
          quantity: 10,
          unitWeightKg: 0.4,
          layerCount: 8,
          constraints: [],
        },
      ],
    },
  ],
};

function getDefaultProductGroups(planId: string): PlanProductGroup[] {
  return [
    {
      id: `GRP-DEF-${planId.slice(0, 8)}`,
      name: 'Genel Kargo',
      color: '#6b7280',
      products: [
        {
          id: `pd-${planId}-001`,
          name: 'Standart Koli Ürün A',
          quantity: 3,
          unitWeightKg: 5.0,
          layerCount: 2,
          constraints: [],
        },
        {
          id: `pd-${planId}-002`,
          name: 'Standart Koli Ürün B',
          quantity: 5,
          unitWeightKg: 3.5,
          layerCount: 3,
          constraints: [],
        },
        {
          id: `pd-${planId}-003`,
          name: 'Palet Ürün C',
          quantity: 2,
          unitWeightKg: 25.0,
          layerCount: 1,
          constraints: ['bottom_only'],
        },
      ],
    },
  ];
}

export function useLoadingPlanProducts(planId: string) {
  return useQuery({
    queryKey: ['loading-plan-products', planId] as const,
    queryFn: (): PlanProductGroup[] => {
      const raw = MOCK_PLAN_PRODUCTS[planId] ?? getDefaultProductGroups(planId);
      return z.array(planProductGroupSchema).parse(raw);
    },
    enabled: Boolean(planId),
    staleTime: 5 * 60 * 1000,
  });
}
