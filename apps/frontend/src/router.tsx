import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/shared/ProtectedRoute';
import { USER_ROLES } from '@/lib/store/useAuthStore';
import { DashboardLayout } from '@/components/shared/layouts/DashboardLayout';
import { PageSuspense } from '@/components/shared/PageSuspense';
import {
  AuthCallbackPage,
  ConfirmEmailChangePage,
  ConfirmEmailChangeRedirect,
  ContactPage,
  DashboardPage,
  ERPItemsPage,
  ErrorPage,
  ForceChangePasswordPage,
  ForgotPasswordPage,
  LandingPage,
  LoadingPlansPage,
  LoginPage,
  NewPlanPage,
  NotificationsPage,
  PrivacyPage,
  ProductCreatePage,
  ProductEditPage,
  ProductsPage,
  RegisterPage,
  ReportDetailPage,
  ReportsPage,
  ResetPasswordPage,
  SecurityRedirect,
  ShareLinksPage,
  SharePage,
  TermsPage,
  UnifiedSettingsPage,
  VehicleCreatePage,
  VehicleEditPage,
  VehiclesPage,
} from '@/pages/lazyPages';

/** ERP ekranı şirket yönetimi yetkisi ister; kenar menüsüyle aynı kural. */
const ERP_ROLES = [USER_ROLES.SuperAdmin, USER_ROLES.CompanyAdmin] as const;

export const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <PageSuspense>
        <LandingPage />
      </PageSuspense>
    ),
  },
  {
    path: '/auth/login',
    element: (
      <PageSuspense>
        <LoginPage />
      </PageSuspense>
    ),
  },
  {
    path: '/auth/register',
    element: (
      <PageSuspense>
        <RegisterPage />
      </PageSuspense>
    ),
  },
  {
    path: '/auth/callback',
    element: (
      <PageSuspense>
        <AuthCallbackPage />
      </PageSuspense>
    ),
  },
  {
    path: '/auth/forgot-password',
    element: (
      <PageSuspense>
        <ForgotPasswordPage />
      </PageSuspense>
    ),
  },
  {
    path: '/auth/reset-password',
    element: (
      <PageSuspense>
        <ResetPasswordPage />
      </PageSuspense>
    ),
  },
  {
    path: '/confirm-email-change',
    element: (
      <PageSuspense>
        <ConfirmEmailChangeRedirect />
      </PageSuspense>
    ),
  },
  {
    path: '/auth/confirm-email-change',
    element: (
      <PageSuspense>
        <ConfirmEmailChangePage />
      </PageSuspense>
    ),
  },
  {
    path: '/auth/force-change-password',
    element: (
      <PageSuspense>
        <ForceChangePasswordPage />
      </PageSuspense>
    ),
  },
  {
    path: '/share/:token',
    element: (
      <PageSuspense>
        <SharePage />
      </PageSuspense>
    ),
  },
  {
    path: '/gizlilik',
    element: (
      <PageSuspense>
        <PrivacyPage />
      </PageSuspense>
    ),
  },
  {
    path: '/kullanim-kosullari',
    element: (
      <PageSuspense>
        <TermsPage />
      </PageSuspense>
    ),
  },
  {
    path: '/iletisim',
    element: (
      <PageSuspense>
        <ContactPage />
      </PageSuspense>
    ),
  },
  {
    path: '/security/revoke',
    element: (
      <PageSuspense>
        <SecurityRedirect />
      </PageSuspense>
    ),
  },
  {
    path: '/error',
    element: (
      <PageSuspense>
        <ErrorPage />
      </PageSuspense>
    ),
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          {
            path: '/dashboard',
            element: (
              <PageSuspense>
                <DashboardPage />
              </PageSuspense>
            ),
          },
          {
            path: '/products',
            element: (
              <PageSuspense>
                <ProductsPage />
              </PageSuspense>
            ),
          },
          {
            path: '/products/new',
            element: (
              <PageSuspense>
                <ProductCreatePage />
              </PageSuspense>
            ),
          },
          {
            path: '/products/:id/edit',
            element: (
              <PageSuspense>
                <ProductEditPage />
              </PageSuspense>
            ),
          },
          {
            path: '/vehicles',
            element: (
              <PageSuspense>
                <VehiclesPage />
              </PageSuspense>
            ),
          },
          {
            path: '/vehicles/new',
            element: (
              <PageSuspense>
                <VehicleCreatePage />
              </PageSuspense>
            ),
          },
          {
            path: '/vehicles/:id/edit',
            element: (
              <PageSuspense>
                <VehicleEditPage />
              </PageSuspense>
            ),
          },
          {
            path: '/planning',
            element: (
              <PageSuspense>
                <LoadingPlansPage />
              </PageSuspense>
            ),
          },
          {
            path: '/planning/new',
            element: (
              <PageSuspense>
                <NewPlanPage />
              </PageSuspense>
            ),
          },
          {
            path: '/reports',
            element: (
              <PageSuspense>
                <ReportsPage />
              </PageSuspense>
            ),
          },
          {
            path: '/reports/:id',
            element: (
              <PageSuspense>
                <ReportDetailPage />
              </PageSuspense>
            ),
          },
          {
            path: '/planning/shares',
            element: (
              <PageSuspense>
                <ShareLinksPage />
              </PageSuspense>
            ),
          },
          {
            path: '/planning/:id',
            element: (
              <PageSuspense>
                <NewPlanPage />
              </PageSuspense>
            ),
          },
          {
            // Menüde yalnızca şirket yöneticisine görünür; adres elle yazıldığında da
            // aynı kısıt uygulanır. Backend tarafında ERP uçları CompanyAdmin ister.
            element: <ProtectedRoute requiredRoles={ERP_ROLES} />,
            children: [
              {
                path: '/erp',
                element: (
                  <PageSuspense>
                    <ERPItemsPage />
                  </PageSuspense>
                ),
              },
            ],
          },
          { path: '/integrations', element: <Navigate to="/settings?tab=erp" replace /> },
          {
            path: '/notifications',
            element: (
              <PageSuspense>
                <NotificationsPage />
              </PageSuspense>
            ),
          },
          {
            path: '/knowledge',
            element: (
              <PageSuspense>
                <DashboardPage />
              </PageSuspense>
            ),
          },
          {
            path: '/settings',
            element: (
              <PageSuspense>
                <UnifiedSettingsPage />
              </PageSuspense>
            ),
          },
          { path: '/profile', element: <Navigate to="/settings?tab=bireysel-hesap" replace /> },
        ],
      },
    ],
  },
]);
