import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ConfirmEmailChangeRedirect } from '@/pages/auth/ConfirmEmailChangeRedirect';
import { ProtectedRoute } from '@/components/shared/ProtectedRoute';
import { DashboardLayout } from '@/components/shared/layouts/DashboardLayout';
import { LandingPage } from '@/pages/public/LandingPage';
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { AuthCallbackPage } from '@/pages/auth/AuthCallbackPage';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage';
import { DashboardPage } from '@/pages/dashboard/DashboardPage';
import { ProductsPage } from '@/pages/products/ProductsPage';
import { NewPlanPage } from '@/pages/plans/NewPlanPage';
import { ProductCreatePage } from '@/pages/products/ProductCreatePage';
import { ProductEditPage } from '@/pages/products/ProductEditPage';
import { VehiclesPage } from '@/pages/vehicles/VehiclesPage';
import { VehicleCreatePage } from '@/pages/vehicles/VehicleCreatePage';
import { VehicleEditPage } from '@/pages/vehicles/VehicleEditPage';
import { LoadingPlansPage } from '@/pages/plans/LoadingPlansPage';
import { ErrorPage } from '@/pages/public/ErrorPage';
import { SharePage } from '@/pages/public/SharePage';
import { SecurityRedirect } from '@/pages/auth/SecurityRedirect';
import { UnifiedSettingsPage } from '@/pages/settings/UnifiedSettingsPage';
import { ReportsPage } from '@/pages/reports/ReportsPage';
import { ReportDetailPage } from '@/pages/reports/ReportDetailPage';
import { NotificationsPage } from '@/pages/notifications/NotificationsPage';
import { ShareLinksPage } from '@/pages/sharing/ShareLinksPage';
import { ConfirmEmailChangePage } from '@/pages/auth/ConfirmEmailChangePage';
import { ForceChangePasswordPage } from '@/pages/auth/ForceChangePasswordPage';
import { ERPItemsPage } from '@/pages/erp/ERPItemsPage';
import { PrivacyPage } from '@/pages/public/PrivacyPage';
import { TermsPage } from '@/pages/public/TermsPage';
import { ContactPage } from '@/pages/public/ContactPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />,
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
    path: '/gizlilik',
    element: <PrivacyPage />,
  },
  {
    path: '/kullanim-kosullari',
    element: <TermsPage />,
  },
  {
    path: '/iletisim',
    element: <ContactPage />,
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
          { path: '/erp', element: <ERPItemsPage /> },
          { path: '/integrations', element: <Navigate to="/settings?tab=erp-baglanti" replace /> },
          { path: '/notifications', element: <NotificationsPage /> },
          { path: '/knowledge', element: <DashboardPage /> },
          { path: '/settings', element: <UnifiedSettingsPage /> },
          { path: '/profile', element: <Navigate to="/settings?tab=bireysel-hesap" replace /> },
        ],
      },
    ],
  },
]);
