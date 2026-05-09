import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/shared/ProtectedRoute';
import { DashboardLayout } from '@/components/shared/layouts/DashboardLayout';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { AuthCallbackPage } from '@/pages/AuthCallbackPage';
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/ResetPasswordPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { ProductsPage } from '@/pages/ProductsPage';
import { NewPlanPage } from '@/pages/NewPlanPage';
import { ProductCreatePage } from '@/pages/ProductCreatePage';
import { ProductEditPage } from '@/pages/ProductEditPage';
import { VehiclesPage } from '@/pages/VehiclesPage';
import { VehicleCreatePage } from '@/pages/VehicleCreatePage';
import { VehicleEditPage } from '@/pages/VehicleEditPage';
import { LoadingPlansPage } from '@/pages/LoadingPlansPage';
import { LoadingPlanDetailPage } from '@/pages/LoadingPlanDetailPage';
import { ErrorPage } from '@/pages/ErrorPage';
import { SharePage } from '@/pages/SharePage';
import { ProfilePage } from '@/pages/ProfilePage';
import { SystemSettingsPage } from '@/pages/SystemSettingsPage';
import { ShareLinksPage } from '@/pages/ShareLinksPage';

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
    path: '/auth/callback',
    element: <AuthCallbackPage />,
  },
  {
    path: '/auth/forgot-password',
    element: <ForgotPasswordPage />,
  },
  {
    path: '/auth/reset-password',
    element: <ResetPasswordPage />,
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
          { path: '/products/new', element: <ProductCreatePage /> },
          { path: '/products/:id', element: <ProductEditPage /> },
          { path: '/vehicles', element: <VehiclesPage /> },
          { path: '/vehicles/new', element: <VehicleCreatePage /> },
          { path: '/vehicles/:id/edit', element: <VehicleEditPage /> },
          { path: '/planning', element: <LoadingPlansPage /> },
          { path: '/planning/new', element: <NewPlanPage /> },
          { path: '/planning/shares', element: <ShareLinksPage /> },
          { path: '/planning/:id', element: <LoadingPlanDetailPage /> },
          { path: '/reports', element: <DashboardPage /> },
          { path: '/integrations', element: <DashboardPage /> },
          { path: '/erp', element: <DashboardPage /> },
          { path: '/notifications', element: <DashboardPage /> },
          { path: '/knowledge', element: <DashboardPage /> },
          { path: '/settings', element: <SystemSettingsPage /> },
          { path: '/profile', element: <ProfilePage /> },
        ],
      },
    ],
  },
]);
