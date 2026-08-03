import { Bell, FileText } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ReportingSettingsTab } from '@/features/platform/components/ReportingSettingsTab';
import { SummaryNotificationForm } from '@/features/platform/components/SummaryNotificationForm';

export function SettingsPage() {
  return (
    <div className="flex w-full flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Sistem Ayarları</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Platform genelinde geçerli ayarları buradan yönetin.
        </p>
      </div>

      <Tabs defaultValue="reporting">
        <TabsList>
          <TabsTrigger value="reporting" className="gap-2">
            <FileText className="h-4 w-4" />
            Raporlama
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            Bildirimler
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reporting">
          <Card>
            <CardHeader>
              <CardTitle>Raporlama Ayarları</CardTitle>
              <CardDescription>
                PDF raporlarında otomatik olarak görünecek kurumsal kimlik bilgilerini tanımlayın.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ReportingSettingsTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Özet E-posta Bildirimleri</CardTitle>
              <CardDescription>
                Seçilen olaylar için düzenli aralıklarla özet e-posta alın.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SummaryNotificationForm />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
