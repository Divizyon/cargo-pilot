import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ProfileForm } from '@/features/platform/components/ProfileForm';
import { EmailChangeSection } from '@/features/platform/components/EmailChangeSection';
import { CompanyMembersTable } from '@/features/platform/components/CompanyMembersTable';
import { SubscriptionTab } from '@/features/platform/components/SubscriptionTab';

const TAB_CLASS =
  'rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none';

export function ProfilePage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">Profilim</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Kişisel bilgilerinizi yönetin ve firma çalışanlarını görüntüleyin.
        </p>
      </div>

      <Tabs defaultValue="individual">
        <TabsList className="h-auto w-full justify-start gap-1 rounded-none border-b bg-transparent p-0">
          <TabsTrigger value="individual" className={TAB_CLASS}>
            Bireysel Hesap
          </TabsTrigger>
          <TabsTrigger value="members" className={TAB_CLASS}>
            Şirket Hesabım
          </TabsTrigger>
          <TabsTrigger value="billing" className={TAB_CLASS}>
            Abonelik
          </TabsTrigger>
        </TabsList>

        <TabsContent value="individual" className="mt-4 flex flex-col gap-6">
          <ProfileForm />
          <EmailChangeSection />
        </TabsContent>

        <TabsContent value="members" className="mt-4 flex flex-col gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Firma Çalışanları</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Firmanızdaki tüm aktif ve pasif kullanıcılar.
            </p>
          </div>
          <CompanyMembersTable />
        </TabsContent>

        <TabsContent value="billing" className="mt-4">
          <SubscriptionTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
