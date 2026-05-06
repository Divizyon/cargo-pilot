import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ReportingSettingsForm } from '@/features/platform/components/ReportingSettingsForm';

export function SettingsPage() {
  return (
    <div className="flex w-full flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Sistem Ayarları</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Platform genelinde geçerli ayarları yönetin.
        </p>
      </div>

      <Tabs defaultValue="reporting">
        <TabsList>
          <TabsTrigger value="reporting">Raporlama</TabsTrigger>
        </TabsList>

        <TabsContent value="reporting" className="mt-6">
          <div className="max-w-2xl space-y-1">
            <h2 className="text-base font-semibold text-foreground">Raporlama Ayarları</h2>
            <p className="text-sm text-muted-foreground">
              PDF raporlarının üst bilgisinde görünecek şirket kimliğini tanımlayın.
            </p>
          </div>
          <div className="mt-6 max-w-2xl">
            <ReportingSettingsForm />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
