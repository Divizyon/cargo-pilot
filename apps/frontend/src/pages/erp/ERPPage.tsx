import { useSearchParams } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { SettingsTabShell } from '@/components/shared/SettingsTabShell';
import { ERPConnectionForm } from '@/features/platform/erp/components/ERPConnectionForm';
import { ERPPendingMatches } from '@/features/platform/erp/components/ERPPendingMatches';
import { ERPShipmentOrders } from '@/features/platform/erp/components/ERPShipmentOrders';
import { ERPSyncHistory } from '@/features/platform/erp/components/ERPSyncHistory';
import { ERPSyncPanel } from '@/features/platform/erp/components/ERPSyncPanel';
import { ERPDraftItems } from '@/features/platform/erp/components/ERPDraftItems';
import { ERPUserMapping } from '@/features/platform/erp/components/ERPUserMapping';
import {
  useERPConnection,
  useERPPendingMatches,
  useERPShipmentOrders,
  useERPSyncLogs,
} from '@/lib/api/useERPIntegration';
import { useDraftItems } from '@/lib/api/useDraftItems';
import { ErpShipmentStatus } from '@/lib/types/erp';

type TabId =
  | 'baglanti'
  | 'eslestirme'
  | 'taslak-urunler'
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
    id: 'taslak-urunler',
    label: 'Taslak Ürünler',
    description: "ERP'den gelen taslak ürünleri inceleyin, onaylayın veya reddedin.",
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
  draftItemCount: number,
): number {
  if (tabId === 'eslestirme') return pendingMatchCount;
  if (tabId === 'taslak-urunler') return draftItemCount;
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
  const { data: shipmentOrders } = useERPShipmentOrders(integrationId, {
    status: ErpShipmentStatus.Pending,
  });
  const { data: syncLogsPage } = useERPSyncLogs(integrationId, { page: 1, pageSize: 20 });
  const { data: draftItemsPage } = useDraftItems({ page: 1, pageSize: 1, status: 0 });

  const pendingMatchCount = pendingMatches?.length ?? 0;
  const pendingShipmentCount = shipmentOrders?.length ?? 0;
  const syncErrorCount =
    syncLogsPage?.items.filter((l) => l.status === 2 || l.status === 3).length ?? 0;
  const draftItemCount = draftItemsPage?.totalCount ?? 0;

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

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
        {/* Sekme paneli — mobil'de yatay scroll, sm'den itibaren dikey sol panel */}
        <div className="w-full shrink-0 sm:w-52">
          <nav className="flex gap-1 overflow-x-auto pb-1 sm:flex-col sm:overflow-x-visible sm:pb-0">
            {TABS.map((tab) => {
              const isActive = tab.id === activeTab;
              const badge = tabBadge(
                tab.id,
                pendingMatchCount,
                pendingShipmentCount,
                syncErrorCount,
                draftItemCount,
              );
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => navigateToTab(tab.id)}
                  className={cn(
                    'flex shrink-0 items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition-colors sm:w-full',
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
            {activeTab === 'taslak-urunler' && <ERPDraftItems />}
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
