import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { PlanCanvas } from '@/features/planning/components/scene/PlanCanvas';
import { Toaster } from '@/components/ui/sonner';
import { queryClient } from '@/lib/api/queryClient';

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div style={{ width: '100vw', height: '100vh' }}>
        <PlanCanvas />
        <Toaster />
      </div>
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
