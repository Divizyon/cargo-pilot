import { useSearchParams } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { SettingsTabShell } from '@/components/shared/SettingsTabShell';
import { ERPConnectionForm } from '@/features/platform/components/ERPConnectionForm';
import { ERPPendingMatches } from '@/features/platform/components/ERPPendingMatches';
import { ERPShipmentOrders } from '@/features/platform/components/ERPShipmentOrders';
import { ERPSyncHistory } from '@/features/platform/components/ERPSyncHistory';
import { ERPSyncPanel } from '@/features/platform/components/ERPSyncPanel';
import { ERPUserMapping } from '@/features/platform/components/ERPUserMapping';
import {
  useERPConnection,
  useERPPendingMatches,
  useERPShipmentOrders,
  useERPSyncHistory,
} from '@/lib/api/useERPIntegration';
import { ErpShipmentStatus } from '@/lib/types/erp';

type TabId =
  | 'baglanti'
  | 'eslestirme'
  | 'sevkiyatlar'
  | 'senkronizasyon'
  | 'gecmis'
  | 'kullanici-eslestirme';

interface TabDef {
  id: TabId;
  label: string;
  description: string;
}

const TABS: TabDef[] = [
  {
    id: 'baglanti',
    label: 'Bağlantı',
    description: 'ERP sistemi bağlantı bilgilerini yapılandırın ve bağlantıyı test edin.',
  },
  {
    id: 'eslestirme',
    label: 'Eşleştirmeler',
    description: 'ERP ürünlerini Cargo Pilot kalemleriyle eşleştirin.',
  },
  {
    id: 'sevkiyatlar',
    label: 'Sevkiyat Emirleri',
    description:
      "ERP'den gelen bekleyen sevkiyat emirlerini inceleyin ve yükleme planına dönüştürün.",
  },
  {
    id: 'senkronizasyon',
    label: 'Senkronizasyon',
    description: 'Otomatik senkronizasyon sıklığını ayarlayın ve manuel senkronizasyon başlatın.',
  },
  {
    id: 'gecmis',
    label: 'Senkronizasyon Geçmişi',
    description: 'Geçmiş senkronizasyon çalışmalarını ve hata kayıtlarını görüntüleyin.',
  },
  {
    id: 'kullanici-eslestirme',
    label: 'Kullanıcı Eşleştirme',
    description: 'ERP kullanıcılarını Cargo Pilot hesaplarıyla eşleştirin.',
  },
];

const VALID_TAB_IDS = new Set<string>(TABS.map((t) => t.id));
const DEFAULT_TAB: TabId = 'baglanti';

function tabBadge(
  tabId: TabId,
  pendingMatchCount: number,
  pendingShipmentCount: number,
  syncErrorCount: number,
): number {
  if (tabId === 'eslestirme') return pendingMatchCount;
  if (tabId === 'sevkiyatlar') return pendingShipmentCount;
  if (tabId === 'gecmis') return syncErrorCount;
  return 0;
}

export function ERPPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab') ?? '';
  const activeTab: TabId = VALID_TAB_IDS.has(rawTab) ? (rawTab as TabId) : DEFAULT_TAB;
  const activeTabDef = TABS.find((t) => t.id === activeTab)!;

  const { data: connection } = useERPConnection();
  const integrationId = connection?.id;

  const { data: pendingMatches } = useERPPendingMatches(integrationId);
  const { data: shipmentOrders } = useERPShipmentOrders({ status: ErpShipmentStatus.Pending });
  const { data: syncRuns } = useERPSyncHistory();

  const pendingMatchCount = pendingMatches?.length ?? 0;
  const pendingShipmentCount = shipmentOrders?.length ?? 0;
  const syncErrorCount =
    syncRuns?.flatMap((r) => r.entries).filter((e) => e.status === 'Error').length ?? 0;

  function navigateToTab(tab: TabId) {
    setSearchParams({ tab }, { replace: false });
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">ERP Entegrasyonu</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          ERP sisteminizi bağlayın, ürün verilerini senkronize edin, eşleştirmeleri ve sevkiyat
          emirlerini yönetin.
        </p>
      </div>

      <div className="flex items-start gap-5">
        {/* Sol sekme paneli */}
        <div className="w-52 shrink-0">
          <nav className="flex flex-col">
            {TABS.map((tab) => {
              const isActive = tab.id === activeTab;
              const badge = tabBadge(
                tab.id,
                pendingMatchCount,
                pendingShipmentCount,
                syncErrorCount,
              );
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => navigateToTab(tab.id)}
                  className={cn(
                    'flex items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition-colors',
                    isActive
                      ? 'bg-accent font-medium text-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                  )}
                >
                  <span>{tab.label}</span>
                  {badge > 0 && (
                    <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-xs">
                      {badge}
                    </Badge>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sağ içerik paneli */}
        <div className="min-w-0 flex-1">
          <SettingsTabShell title={activeTabDef.label} description={activeTabDef.description}>
            {activeTab === 'baglanti' && <ERPConnectionForm />}
            {activeTab === 'eslestirme' && <ERPPendingMatches />}
            {activeTab === 'sevkiyatlar' && <ERPShipmentOrders />}
            {activeTab === 'senkronizasyon' && <ERPSyncPanel />}
            {activeTab === 'gecmis' && <ERPSyncHistory />}
            {activeTab === 'kullanici-eslestirme' && <ERPUserMapping />}
          </SettingsTabShell>
        </div>
      </div>
    </div>
  );
}
