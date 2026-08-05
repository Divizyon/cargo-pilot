import { Suspense, type ReactNode } from 'react';

interface PageSuspenseProps {
  children: ReactNode;
}

/** Rota kendi chunk'ını yüklerken sayfa zeminini korur. */
export function PageSuspense({ children }: PageSuspenseProps) {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-background" aria-busy="true" />}>
      {children}
    </Suspense>
  );
}
