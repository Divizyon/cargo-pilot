import { useCallback, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { SettingsTabShell } from '@/components/shared/SettingsTabShell';
import { ProfileForm } from '@/features/platform/profile/components/ProfileForm';
import { CompanyMembersTable } from '@/features/platform/members/components/CompanyMembersTable';
import { SubscriptionTab } from '@/features/platform/billing/components/SubscriptionTab';
import { RegionalSettingsTab } from '@/features/platform/settings/components/RegionalSettingsTab';
import { ReportingSettingsTab } from '@/features/platform/settings/components/ReportingSettingsTab';
import { ERPConnectionForm } from '@/features/platform/erp/components/ERPConnectionForm';
import { ERPSyncHistory } from '@/features/platform/erp/components/ERPSyncHistory';
import { ERPSyncPanel } from '@/features/platform/erp/components/ERPSyncPanel';
import { useERPConnection, useERPSyncLogs } from '@/lib/api/useERPIntegration';
import { useAuthStore, isCompanyAdminRole } from '@/lib/store/useAuthStore';

type TabId =
  | 'bireysel-hesap'
  | 'kullanicilar'
  | 'abonelik'
  | 'bolgesel-ayarlar'
  | 'raporlama-ayarlari'
  | 'erp-baglanti'
  | 'erp-senkronizasyon'
  | 'erp-gecmis';

interface TabDef {
  id: TabId;
  label: string;
  description: string;
}

const GENERAL_TABS: TabDef[] = [
  {
    id: 'bireysel-hesap',
    label: 'Bireysel Hesap',
    description: 'Ad, soyad ve hesap güvenliğinizi güncelleyin.',
  },
  {
    id: 'kullanicilar',
    label: 'Kullanıcılar',
    description: 'Firma üyelerini ve erişim rollerini yönetin.',
  },
  {
    id: 'abonelik',
    label: 'Abonelik',
    description: 'Mevcut planınızı görüntüleyin ve yükseltin.',
  },
  {
    id: 'bolgesel-ayarlar',
    label: 'Bölgesel ve Birim Ayarları',
    description: 'Dil, saat dilimi ve ölçü birimlerini yapılandırın.',
  },
  {
    id: 'raporlama-ayarlari',
    label: 'Raporlama ve Çıktı Standartları',
    description: 'PDF ve Excel raporlarında kullanılacak şirket bilgilerini girin.',
  },
];

const ERP_TABS: TabDef[] = [
  {
    id: 'erp-baglanti',
    label: 'Bağlantı',
    description: 'ERP sistemi bağlantı bilgilerini yapılandırın ve bağlantıyı test edin.',
  },
  {
    id: 'erp-senkronizasyon',
    label: 'Senkronizasyon',
    description:
      'Otomatik senkronizasyon sıklığını ayarlayın veya senkronizasyonu şimdi başlatın.',
  },
  {
    id: 'erp-gecmis',
    label: 'Senkronizasyon Geçmişi',
    description:
      'Geçmiş senkronizasyon çalışmalarını, satır kırılımını ve hata kayıtlarını görüntüleyin.',
  },
];

/** Hata rozeti için kayıt listesi gerekmez; zarftaki failedCount okunur. */
const BADGE_ONLY_PAGE_SIZE = 1;

const ALL_TABS = [...GENERAL_TABS, ...ERP_TABS];
const VALID_TAB_IDS = new Set<string>(ALL_TABS.map((t) => t.id));
const DEFAULT_TAB: TabId = 'bireysel-hesap';

/**
 * Backend'de CompanyAdmin politikasıyla korunan uçları kullanan sekmeler.
 * Yetkisiz kullanıcı bu sekmeleri göremez; URL ile gelirse varsayılana düşer.
 */
const ADMIN_ONLY_TABS = new Set<TabId>([
  'kullanicilar',
  'erp-baglanti',
  'erp-senkronizasyon',
  'erp-gecmis',
]);
const DIRTY_TRACKED_TABS = new Set<TabId>(['bolgesel-ayarlar']);

export function UnifiedSettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentUserRole = useAuthStore((s) => s.user?.role);
  const canManageCompany = isCompanyAdminRole(currentUserRole);

  const rawTab = searchParams.get('tab') ?? '';
  const requestedTab: TabId = VALID_TAB_IDS.has(rawTab) ? (rawTab as TabId) : DEFAULT_TAB;
  // Yetkisiz kullanıcı admin sekmesine URL ile gelirse varsayılana düşer.
  const activeTab: TabId =
    ADMIN_ONLY_TABS.has(requestedTab) && !canManageCompany ? DEFAULT_TAB : requestedTab;
  const activeTabDef = ALL_TABS.find((t) => t.id === activeTab)!;

  const visibleGeneralTabs = GENERAL_TABS.filter(
    (t) => canManageCompany || !ADMIN_ONLY_TABS.has(t.id),
  );
  const visibleErpTabs = canManageCompany ? ERP_TABS : [];

  const [pendingTab, setPendingTab] = useState<TabId | null>(null);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const dirtyTabs = useRef<Set<TabId>>(new Set());

  const { data: connection } = useERPConnection();
  const integrationId = connection?.id;
  // Rozet yalnızca sayıyı kullanır; kayıtların kendisi Geçmiş sekmesinde yüklenir.
  const { data: syncLogsPage } = useERPSyncLogs(integrationId, {
    page: 1,
    pageSize: BADGE_ONLY_PAGE_SIZE,
  });

  // Sayı sunucudan gelir; sayfa sınırındaki kayıtları sayarak tahmin edilmez.
  const syncErrorCount = syncLogsPage?.failedCount ?? 0;

  function getErpBadge(tabId: TabId): number {
    return tabId === 'erp-gecmis' ? syncErrorCount : 0;
  }

  const handleDirtyChange = useCallback((tab: TabId, dirty: boolean) => {
    if (dirty) {
      dirtyTabs.current.add(tab);
    } else {
      dirtyTabs.current.delete(tab);
    }
  }, []);

  function navigateToTab(tab: TabId) {
    if (tab === activeTab) return;
    if (DIRTY_TRACKED_TABS.has(activeTab) && dirtyTabs.current.has(activeTab)) {
      setPendingTab(tab);
      setShowUnsavedDialog(true);
    } else {
      setSearchParams({ tab }, { replace: false });
    }
  }

  function confirmLeave() {
    if (pendingTab) {
      dirtyTabs.current.delete(activeTab);
      setSearchParams({ tab: pendingTab }, { replace: false });
      setPendingTab(null);
    }
    setShowUnsavedDialog(false);
  }

  function cancelLeave() {
    setPendingTab(null);
    setShowUnsavedDialog(false);
  }

  function renderNavButton(tab: TabDef, badge?: number) {
    const isActive = tab.id === activeTab;
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
        {badge != null && badge > 0 && (
          <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-xs">
            {badge}
          </Badge>
        )}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">Ayarlar</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Hesap ve platform tercihlerinizi yönetin.
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-4">
        {/* Sekme paneli — mobil'de yatay scroll, sm'den itibaren dikey sol panel */}
        <div className="w-full shrink-0 rounded-xl bg-card p-3 sm:w-52">
          <nav className="flex gap-1 overflow-x-auto pb-1 sm:flex-col sm:overflow-x-visible sm:pb-0">
            {visibleGeneralTabs.map((tab) => renderNavButton(tab))}

            {visibleErpTabs.length > 0 && (
              <>
                {/* ERP grup ayırıcı */}
                <div className="my-1 hidden sm:block">
                  <div className="border-t" />
                  <p className="mt-2 px-3 text-xs font-medium text-muted-foreground">
                    ERP Entegrasyonu
                  </p>
                </div>

                {visibleErpTabs.map((tab) => renderNavButton(tab, getErpBadge(tab.id)))}
              </>
            )}
          </nav>
        </div>

        {/* Sağ içerik paneli */}
        <div className="min-w-0 flex-1 rounded-xl bg-card p-5 sm:p-6">
          <SettingsTabShell title={activeTabDef.label} description={activeTabDef.description}>
            {activeTab === 'bireysel-hesap' && <ProfileForm />}
            {activeTab === 'kullanicilar' && (
              <CompanyMembersTable onNavigateToBilling={() => navigateToTab('abonelik')} />
            )}
            {activeTab === 'abonelik' && <SubscriptionTab />}
            {activeTab === 'bolgesel-ayarlar' && (
              <RegionalSettingsTab
                onDirtyChange={(dirty) => handleDirtyChange('bolgesel-ayarlar', dirty)}
              />
            )}
            {activeTab === 'raporlama-ayarlari' && <ReportingSettingsTab />}
            {activeTab === 'erp-baglanti' && <ERPConnectionForm />}
            {activeTab === 'erp-senkronizasyon' && <ERPSyncPanel />}
            {activeTab === 'erp-gecmis' && <ERPSyncHistory />}
          </SettingsTabShell>
        </div>
      </div>

      <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kaydedilmemiş değişiklikler</AlertDialogTitle>
            <AlertDialogDescription>
              Kaydedilmemiş değişiklikleriniz var. Ayrılmak istiyor musunuz?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelLeave}>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmLeave}>Ayrıl</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
