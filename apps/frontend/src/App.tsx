import { PlanCanvas } from '@/features/planning/components/scene/PlanCanvas';
import { Toaster } from '@/components/ui/sonner';

export function App() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <PlanCanvas />
      <Toaster />
    </div>
  );
}
