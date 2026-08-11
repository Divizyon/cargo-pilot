import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const mocks = vi.hoisted(() => ({ post: vi.fn(), get: vi.fn() }));

vi.mock('@/lib/api/axiosInstance', () => ({
  axiosInstance: { get: mocks.get, post: mocks.post, put: vi.fn() },
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const { useApprovePlan, useLoadingPlanListItem } = await import('./useLoadingPlans');

const PLAN_ID = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

/** Backend zarfı: Result<ApprovePlanResult> */
function approveResponse(erpExportQueued: boolean, message: string) {
  return {
    data: {
      isSuccess: true,
      message,
      data: { planId: PLAN_ID, erpExportQueued },
    },
  };
}

/** Plan detay ucu: ERP aktarım durumu ve son başarısız denemenin nedeni. */
function detailResponse(erp: { erpExportStatus?: number | null; erpExportMessage?: string | null }) {
  return {
    data: {
      isSuccess: true,
      data: {
        id: PLAN_ID,
        planName: 'Plan 1',
        vehicle: { id: '11111111-2222-4333-8444-555555555555', vehicleName: 'Tır', maxWeightCapacity: 20000 },
        optimizationStatus: 1,
        createdAtUtc: '2026-08-11T10:00:00Z',
        ...erp,
      },
    },
  };
}

describe('useLoadingPlanListItem — ERP aktarım durumu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('aktarılan planda durumu ve nedeni sunucudan okur', async () => {
    mocks.get.mockResolvedValue(detailResponse({ erpExportStatus: 1 }));

    const { result } = renderHook(() => useLoadingPlanListItem(PLAN_ID), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.erpExportStatus).toBe(1);
    expect(result.current.data?.erpExportMessage).toBeUndefined();
  });

  it('başarısız aktarımda nedeni taşır', async () => {
    mocks.get.mockResolvedValue(
      detailResponse({ erpExportStatus: 2, erpExportMessage: 'ERP sunucusuna bağlanılamadı.' }),
    );

    const { result } = renderHook(() => useLoadingPlanListItem(PLAN_ID), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.erpExportStatus).toBe(2);
    expect(result.current.data?.erpExportMessage).toBe('ERP sunucusuna bağlanılamadı.');
  });

  it('bilinmeyen durum kodunda rozet için değer üretmez', async () => {
    mocks.get.mockResolvedValue(detailResponse({ erpExportStatus: 99 }));

    const { result } = renderHook(() => useLoadingPlanListItem(PLAN_ID), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.erpExportStatus).toBeUndefined();
  });
});

describe('useApprovePlan', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('aktarım kapalıyken kuyruğa alındı bilgisi vermez, backend mesajını döner', async () => {
    mocks.post.mockResolvedValue(
      approveResponse(false, 'Plan onaylandı. ERP aktarımı şu an kapalı olduğu için aktarım yapılmadı.'),
    );

    const { result } = renderHook(() => useApprovePlan(), { wrapper });
    const outcome = await result.current.mutateAsync(PLAN_ID);

    expect(outcome.erpExportQueued).toBe(false);
    expect(outcome.message).toBe(
      'Plan onaylandı. ERP aktarımı şu an kapalı olduğu için aktarım yapılmadı.',
    );
  });

  it('aktarım açıkken kuyruğa alındı bilgisini döner', async () => {
    mocks.post.mockResolvedValue(
      approveResponse(true, 'Plan onaylandı, ERP aktarımı kuyruğa alındı.'),
    );

    const { result } = renderHook(() => useApprovePlan(), { wrapper });
    const outcome = await result.current.mutateAsync(PLAN_ID);

    expect(outcome.erpExportQueued).toBe(true);
    expect(outcome.message).toBe('Plan onaylandı, ERP aktarımı kuyruğa alındı.');
  });

  it('beklenmeyen yanıt gövdesinde aktarımı kuyrukta göstermez', async () => {
    mocks.post.mockResolvedValue({ data: 'beklenmeyen' });

    const { result } = renderHook(() => useApprovePlan(), { wrapper });
    const outcome = await result.current.mutateAsync(PLAN_ID);

    expect(outcome.erpExportQueued).toBe(false);
    expect(outcome.message).toBe('Plan onaylandı.');
  });

  it('hata durumunda backend zarfındaki nedeni yüzeye çıkarır', async () => {
    const { toast } = await import('sonner');
    mocks.post.mockRejectedValue({
      response: {
        status: 422,
        data: {
          isSuccess: false,
          message: 'Tanımlı bir ERP bağlantısı bulunmadığı için plan ERP\'e aktarılamaz.',
          error: {
            code: 'Erp.NoIntegration',
            description: 'Tanımlı bir ERP bağlantısı bulunmadığı için plan ERP\'e aktarılamaz.',
          },
        },
      },
    });

    const { result } = renderHook(() => useApprovePlan(), { wrapper });
    await expect(result.current.mutateAsync(PLAN_ID)).rejects.toBeDefined();

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        'Tanımlı bir ERP bağlantısı bulunmadığı için plan ERP\'e aktarılamaz.',
        { position: 'bottom-right' },
      ),
    );
  });
});
