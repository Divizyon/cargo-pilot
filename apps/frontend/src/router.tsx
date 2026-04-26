import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/shared/ProtectedRoute';
import { DashboardLayout } from '@/components/shared/layouts/DashboardLayout';
import { FocusModeLayout } from '@/components/shared/layouts/FocusModeLayout';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { ProductsPage } from '@/pages/ProductsPage';
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
    path: '/auth/register',
    element: <RegisterPage />,
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
          { path: '/products', element: <ProductsPage /> },
          { path: '/vehicles', element: <DashboardPage /> },
          { path: '/planning', element: <DashboardPage /> },
          { path: '/reports', element: <DashboardPage /> },
          { path: '/settings', element: <DashboardPage /> },
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
