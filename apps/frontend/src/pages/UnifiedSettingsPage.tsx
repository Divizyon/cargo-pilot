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
import { cn } from '@/lib/utils';
import { ProfileForm } from '@/features/platform/components/ProfileForm';
import { CompanyMembersTable } from '@/features/platform/components/CompanyMembersTable';
import { SubscriptionTab } from '@/features/platform/components/SubscriptionTab';
import { RegionalSettingsTab } from '@/features/platform/components/settings/RegionalSettingsTab';
import { VisualizationSettingsTab } from '@/features/platform/components/settings/VisualizationSettingsTab';
import { ReportingSettingsTab } from '@/features/platform/components/ReportingSettingsTab';

type TabId =
  | 'bireysel-hesap'
  | 'kullanicilar'
  | 'abonelik'
  | 'bolgesel-ayarlar'
  | 'goruntu-ayarlari'
  | 'raporlama-ayarlari';

interface TabDef {
  id: TabId;
  label: string;
}

const TABS: TabDef[] = [
  { id: 'bireysel-hesap',    label: 'Bireysel Hesap'                     },
  { id: 'kullanicilar',       label: 'Kullanıcılar'                      },
  { id: 'abonelik',           label: 'Abonelik'                          },
  { id: 'bolgesel-ayarlar',   label: 'Bölgesel ve Birim Ayarları'        },
  { id: 'goruntu-ayarlari',   label: 'Görselleştirme ve Arayüz'           },
  { id: 'raporlama-ayarlari', label: 'Raporlama ve Çıktı Standartları'   },
];

const VALID_TAB_IDS = new Set<string>(TABS.map((t) => t.id));
const DEFAULT_TAB: TabId = 'bireysel-hesap';
// Kaydedilmemiş değişiklik kontrolü yalnızca bu sekmeler için yapılır
const DIRTY_TRACKED_TABS = new Set<TabId>(['bolgesel-ayarlar', 'goruntu-ayarlari']);

export function UnifiedSettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab') ?? '';
  const activeTab: TabId = VALID_TAB_IDS.has(rawTab) ? (rawTab as TabId) : DEFAULT_TAB;

  const [pendingTab, setPendingTab] = useState<TabId | null>(null);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const dirtyTabs = useRef<Set<TabId>>(new Set());

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

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">Ayarlar</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Hesap ve platform tercihlerinizi yönetin.
        </p>
      </div>

      <div className="flex items-start gap-5">
        {/* Sol sekme paneli */}
        <div className="w-52 shrink-0">
          <nav className="flex flex-col">
            {TABS.map((tab) => {
              const isActive = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => navigateToTab(tab.id)}
                  className={cn(
                    'rounded-lg px-3 py-2.5 text-left text-sm transition-colors',
                    isActive
                      ? 'bg-accent font-medium text-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sağ içerik paneli */}
        <div className="min-w-0 flex-1">
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
          {activeTab === 'goruntu-ayarlari' && (
            <VisualizationSettingsTab
              onDirtyChange={(dirty) => handleDirtyChange('goruntu-ayarlari', dirty)}
            />
          )}
          {activeTab === 'raporlama-ayarlari' && <ReportingSettingsTab />}
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
