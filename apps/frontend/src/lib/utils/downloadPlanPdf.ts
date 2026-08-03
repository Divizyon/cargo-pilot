import { useAuthStore } from '@/lib/store/useAuthStore';

export async function downloadPlanPdf(planId: string): Promise<void> {
  const token = useAuthStore.getState().accessToken;
  const res = await fetch(`/api/v1/loading-plans/${planId}/pdf`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`PDF indirilemedi: ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `CargoPilot_Plan_${planId.slice(0, 8)}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
