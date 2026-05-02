export function downloadPlanPdf(planId: string): void {
  const a = document.createElement('a');
  a.href = `/api/v1/loading-plans/${planId}/report`;
  a.download = `CargoPilot_Plan_${planId.slice(0, 8)}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
