import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthGate } from './auth/AuthGate';
import { applyStoredTheme } from './components/shared/AppShell';
import './index.css';

applyStoredTheme();

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthGate />
      <Toaster />
    </QueryClientProvider>
  </StrictMode>,
);
