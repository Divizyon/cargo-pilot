import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/shared/ProtectedRoute';
import { DashboardLayout } from '@/components/shared/layouts/DashboardLayout';
import { FocusModeLayout } from '@/components/shared/layouts/FocusModeLayout';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { ErrorPage } from '@/pages/ErrorPage';
import { SharePage } from '@/pages/SharePage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: '/auth/login',
    element: <LoginPage />,
  },
  {
    path: '/share/:token',
    element: <SharePage />,
  },
  {
    path: '/error',
    element: <ErrorPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          { path: '/dashboard', element: <DashboardPage /> },
        ],
      },
      {
        element: <FocusModeLayout />,
        children: [
          // Squad 2: /plan/new, /plan/:id vb. buraya eklenir
        ],
      },
    ],
  },
]);
