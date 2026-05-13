import type { ReactNode } from 'react';

interface SettingsTabShellProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function SettingsTabShell({ title, description, children }: SettingsTabShellProps) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {description && (
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}
