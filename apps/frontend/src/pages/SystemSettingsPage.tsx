import { useState, useRef, useCallback } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
import { RegionalSettingsTab } from '@/features/platform/components/settings/RegionalSettingsTab';
import { VisualizationSettingsTab } from '@/features/platform/components/settings/VisualizationSettingsTab';
import { ReportingSettingsTab } from '@/features/platform/components/settings/ReportingSettingsTab';

type TabId = 'regional' | 'visualization' | 'reporting';

const TAB_LABELS: Record<TabId, string> = {
  regional: 'Bölgesel ve Birim Ayarları',
  visualization: 'Görselleştirme ve Arayüz Ayarları',
  reporting: 'Raporlama ve Çıktı Standartları',
};

export function SystemSettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('regional');
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

  function handleTabChange(next: string) {
    const nextTab = next as TabId;
    if (dirtyTabs.current.has(activeTab)) {
      setPendingTab(nextTab);
      setShowUnsavedDialog(true);
    } else {
      setActiveTab(nextTab);
    }
  }

  function confirmLeave() {
    if (pendingTab) {
      setActiveTab(pendingTab);
      setPendingTab(null);
    }
    setShowUnsavedDialog(false);
  }

  function cancelLeave() {
    setPendingTab(null);
    setShowUnsavedDialog(false);
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Sistem Ayarları</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Platforma ait tüm yapılandırma seçeneklerini buradan yönetin.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="h-auto w-full justify-start gap-1 rounded-none border-b bg-transparent p-0">
          {(Object.keys(TAB_LABELS) as TabId[]).map((tab) => (
            <TabsTrigger
              key={tab}
              value={tab}
              className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              {TAB_LABELS[tab]}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="regional" className="mt-6">
          <RegionalSettingsTab onDirtyChange={(dirty) => handleDirtyChange('regional', dirty)} />
        </TabsContent>

        <TabsContent value="visualization" className="mt-6">
          <VisualizationSettingsTab
            onDirtyChange={(dirty) => handleDirtyChange('visualization', dirty)}
          />
        </TabsContent>

        <TabsContent value="reporting" className="mt-6">
          <ReportingSettingsTab
            onDirtyChange={(dirty) => handleDirtyChange('reporting', dirty)}
          />
        </TabsContent>
      </Tabs>

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
