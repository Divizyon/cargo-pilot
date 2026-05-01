import { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { RouterProvider } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Toaster } from '@/components/ui/sonner';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { GlobalSpinner } from '@/components/shared/GlobalSpinner';
import { NotificationBridge } from '@/components/shared/NotificationBridge';
import { queryClient } from '@/lib/api/queryClient';
import { initializeAuth } from '@/lib/auth/initializeAuth';
import { GOOGLE_CLIENT_ID } from '@/lib/config/env';
import { router } from './router';

export function App() {
  useEffect(() => {
    void initializeAuth();
  }, []);

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID ?? ''}>
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          <RouterProvider router={router} />
          <GlobalSpinner />
          <NotificationBridge />
          <Toaster />
          {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
        </ErrorBoundary>
      </QueryClientProvider>
    </GoogleOAuthProvider>
  );
}

//hfvjdxb
