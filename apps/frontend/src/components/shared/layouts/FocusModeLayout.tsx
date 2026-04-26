import { Outlet } from 'react-router-dom';

export function FocusModeLayout() {
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background">
      <Outlet />
    </div>
  );
}
