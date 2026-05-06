import { useAuthStore } from '@/lib/store/useAuthStore';
import { ProfileForm } from '@/features/platform/components/ProfileForm';
import { EmailChangeSection } from '@/features/platform/components/EmailChangeSection';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  manager: 'Yönetici',
  viewer: 'Görüntüleyici',
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function ProfilePage() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="flex w-full flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Profilim</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Kişisel bilgilerinizi görüntüleyin ve güncelleyin.
        </p>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
          {user ? getInitials(user.fullName) : '?'}
        </div>
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-foreground">
            {user?.fullName ?? '—'}
          </p>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">{user?.email ?? ''}</p>
          {user?.role && (
            <span className="mt-1.5 inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {ROLE_LABELS[user.role] ?? user.role}
            </span>
          )}
        </div>
      </div>

      <ProfileForm />
      <EmailChangeSection />
    </div>
  );
}
