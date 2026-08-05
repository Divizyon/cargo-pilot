import { useDashboardPlans } from '@/lib/api/useDashboardStats';

const RECENT_PLAN_LIMIT = 7;

/**
 * Panelin "son planlar" kartı. Panel plan listesiyle birebir aynı isteği
 * kullanır; daha önce aynı URL ayrı bir anahtarla ikinci kez çekiliyordu.
 */
export function useRecentPlans() {
  return useDashboardPlans((plans) => plans.slice(0, RECENT_PLAN_LIMIT));
}
