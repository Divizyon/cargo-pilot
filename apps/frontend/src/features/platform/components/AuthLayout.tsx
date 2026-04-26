// src/features/platform/components/AuthLayout.tsx
import type { ReactNode } from 'react';
import { Package } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="mb-8 flex items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
          <Package className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="text-lg font-semibold tracking-tight text-foreground">Cargo Pilot</span>
      </div>

      {/* Form Card */}
      <Card className="w-full max-w-md rounded-xl border-border shadow-sm p-8">{children}</Card>
    </div>
  );
}
