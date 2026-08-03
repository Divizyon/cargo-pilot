import { useAuthStore } from '@/lib/store/useAuthStore';
import { getGreetingByHour } from '@/lib/utils/getGreetingByHour';

const dateFormatter = new Intl.DateTimeFormat('tr-TR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export function DashboardGreeting() {
  const user = useAuthStore((s) => s.user);

  const displayName = user?.fullName?.trim() || null;
  const greeting = getGreetingByHour(new Date().getHours());
  const formattedDate = dateFormatter.format(new Date());

  return (
    <div>
      <h1 className="text-xl font-bold tracking-tight text-foreground">
        {displayName ? `${greeting}, ${displayName}` : 'Hoş geldiniz'}
      </h1>
      <p className="text-sm text-muted-foreground mt-1">{formattedDate}</p>
    </div>
  );
}
