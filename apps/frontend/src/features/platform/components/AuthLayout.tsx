// src/features/platform/components/AuthLayout.tsx
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { CargoPilotLogo } from '@/components/shared/CargoPilotLogo';

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-dvh bg-background flex flex-col items-center justify-center p-4 py-16 sm:py-4">
      {/* Top-left logo — links back to landing page */}
      <Link
        to="/"
        className="hidden md:flex fixed top-5 left-5 items-center gap-2 transition-opacity hover:opacity-75"
      >
        <CargoPilotLogo className="w-7 h-7 shrink-0 text-foreground" />
        <span className="font-semibold text-sm text-foreground">Cargo Pilot</span>
      </Link>

      {/* Centered logo */}
      <div className="mb-8 flex items-center gap-2.5">
        <CargoPilotLogo className="h-8 w-8 shrink-0 text-foreground" />
        <span className="text-lg font-semibold tracking-tight text-foreground">Cargo Pilot</span>
      </div>

      {/* Form Card */}
      <Card className="w-full max-w-md rounded-xl border-border shadow-sm p-5 sm:p-8">
        {children}
      </Card>
    </div>
  );
}
