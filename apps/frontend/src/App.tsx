import { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { RouterProvider } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { GlobalSpinner } from '@/components/shared/GlobalSpinner';
import { NotificationBridge } from '@/components/shared/NotificationBridge';
import { queryClient } from '@/lib/api/queryClient';
import { initializeAuth } from '@/lib/auth/initializeAuth';
import { useUIStore } from '@/lib/store/useUIStore';
import { useUnitStore } from '@/lib/store/useUnitStore';
import i18n from '@/lib/config/i18n';
import { router } from './router';

export function App() {
  const theme = useUIStore((s) => s.theme);
  const language = useUnitStore((s) => s.language);

  useEffect(() => {
    void initializeAuth();
  }, []);

  useEffect(() => {
    void i18n.changeLanguage(language);
  }, [language]);

  useEffect(() => {
    const root = document.documentElement;
    const applyDark =
      theme === 'dark' ||
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    root.classList.toggle('dark', applyDark);
  }, [theme]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ErrorBoundary>
          <RouterProvider router={router} />
          <GlobalSpinner />
          <NotificationBridge />
          <Toaster />
          {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
        </ErrorBoundary>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
