import type { ReactNode } from 'react';

interface DashboardWidgetProps {
  title: string;
  children: ReactNode;
}

export function DashboardWidget({ title, children }: DashboardWidgetProps) {
  return (
    <div>
      <h2>{title}</h2>
      {children}
    </div>
  );
}
