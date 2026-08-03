import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { CargoPilotLogoAnimated } from '@/components/shared/CargoPilotLogoAnimated';
import { CraneAnimation } from '@/components/shared/CraneAnimation';

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-dvh bg-background lg:grid lg:grid-cols-[30%_70%] lg:h-dvh lg:overflow-hidden">
      {/* Left panel — desktop only */}
      <div className="hidden lg:flex flex-col relative overflow-hidden bg-zinc-950">
        <div className="absolute inset-0">
          <CraneAnimation mirror={false} dark={true} />
        </div>

        <div className="relative z-10 flex flex-col h-full p-10 justify-end pointer-events-none">
          <div>
            <p className="text-white/50 text-sm font-medium mb-1">
              Lojistiği yeniden tanımlıyoruz.
            </p>
            <p className="text-white text-xl font-bold leading-snug">
              Her yükü planla.
              <br />
              Mükemmel şekilde.
            </p>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-col items-center justify-center p-4 py-16 sm:py-4 min-h-dvh lg:min-h-0 lg:overflow-y-auto">
        <Link
          to="/"
          className="mb-8 flex flex-col items-center gap-3 transition-opacity hover:opacity-75 overflow-visible pt-10"
        >
          <CargoPilotLogoAnimated className="h-[72px] w-[72px] shrink-0 text-foreground" />
          <span className="text-lg font-semibold tracking-tight text-foreground">Cargo Pilot</span>
        </Link>

        <Card className="w-full max-w-md rounded-xl border-border shadow-sm p-5 sm:p-8">
          {children}
        </Card>
      </div>
    </div>
  );
}
