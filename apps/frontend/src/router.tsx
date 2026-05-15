import { createBrowserRouter, Navigate, useSearchParams } from 'react-router-dom';

function ConfirmEmailChangeRedirect() {
  const [searchParams] = useSearchParams();
  return <Navigate to={`/auth/confirm-email-change?${searchParams.toString()}`} replace />;
}
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
import { ErrorPage } from '@/pages/ErrorPage';
import { SharePage } from '@/pages/SharePage';
import { SecurityRedirect } from '@/pages/SecurityRedirect';
import { UnifiedSettingsPage } from '@/pages/UnifiedSettingsPage';
import { ReportsPage } from '@/pages/ReportsPage';
import { ReportDetailPage } from '@/pages/ReportDetailPage';
import { NotificationsPage } from '@/pages/NotificationsPage';
import { ShareLinksPage } from '@/pages/ShareLinksPage';
import { ConfirmEmailChangePage } from '@/pages/ConfirmEmailChangePage';
import { ForceChangePasswordPage } from '@/pages/ForceChangePasswordPage';

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
    path: '/confirm-email-change',
    element: <ConfirmEmailChangeRedirect />,
  },
  {
    path: '/auth/confirm-email-change',
    element: <ConfirmEmailChangePage />,
  },
  {
    path: '/auth/force-change-password',
    element: <ForceChangePasswordPage />,
  },
  {
    path: '/share/:token',
    element: <SharePage />,
  },
  {
    path: '/security/revoke',
    element: <SecurityRedirect />,
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
          { path: '/products/:id/edit', element: <ProductEditPage /> },
          { path: '/vehicles', element: <VehiclesPage /> },
          { path: '/vehicles/new', element: <VehicleCreatePage /> },
          { path: '/vehicles/:id/edit', element: <VehicleEditPage /> },
          { path: '/planning', element: <LoadingPlansPage /> },
          { path: '/planning/new', element: <NewPlanPage /> },
          { path: '/reports', element: <ReportsPage /> },
          { path: '/reports/:id', element: <ReportDetailPage /> },
          { path: '/planning/shares', element: <ShareLinksPage /> },
          { path: '/planning/:id', element: <NewPlanPage /> },
          { path: '/integrations', element: <DashboardPage /> },
          { path: '/erp', element: <DashboardPage /> },
          { path: '/notifications', element: <NotificationsPage /> },
          { path: '/knowledge', element: <DashboardPage /> },
          { path: '/settings', element: <UnifiedSettingsPage /> },
          { path: '/profile', element: <Navigate to="/settings?tab=bireysel-hesap" replace /> },
        ],
      },
    ],
  },
]);
