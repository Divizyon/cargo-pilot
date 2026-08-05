import { lazy } from 'react';

/**
 * Rota bileşenleri dinamik yüklenir; aksi halde landing ziyaretçisi de
 * three.js, gsap ve xlsx dahil tüm uygulamayı indirir.
 * Sayfalar named export olduğu için default'a sarılır.
 */

export const LandingPage = lazy(() =>
  import('@/pages/public/LandingPage').then((m) => ({ default: m.LandingPage })),
);
export const LoginPage = lazy(() =>
  import('@/pages/auth/LoginPage').then((m) => ({ default: m.LoginPage })),
);
export const RegisterPage = lazy(() =>
  import('@/pages/auth/RegisterPage').then((m) => ({ default: m.RegisterPage })),
);
export const AuthCallbackPage = lazy(() =>
  import('@/pages/auth/AuthCallbackPage').then((m) => ({ default: m.AuthCallbackPage })),
);
export const ForgotPasswordPage = lazy(() =>
  import('@/pages/auth/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })),
);
export const ResetPasswordPage = lazy(() =>
  import('@/pages/auth/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })),
);
export const ConfirmEmailChangeRedirect = lazy(() =>
  import('@/pages/auth/ConfirmEmailChangeRedirect').then((m) => ({
    default: m.ConfirmEmailChangeRedirect,
  })),
);
export const ConfirmEmailChangePage = lazy(() =>
  import('@/pages/auth/ConfirmEmailChangePage').then((m) => ({
    default: m.ConfirmEmailChangePage,
  })),
);
export const ForceChangePasswordPage = lazy(() =>
  import('@/pages/auth/ForceChangePasswordPage').then((m) => ({
    default: m.ForceChangePasswordPage,
  })),
);
export const SharePage = lazy(() =>
  import('@/pages/public/SharePage').then((m) => ({ default: m.SharePage })),
);
export const PrivacyPage = lazy(() =>
  import('@/pages/public/PrivacyPage').then((m) => ({ default: m.PrivacyPage })),
);
export const TermsPage = lazy(() =>
  import('@/pages/public/TermsPage').then((m) => ({ default: m.TermsPage })),
);
export const ContactPage = lazy(() =>
  import('@/pages/public/ContactPage').then((m) => ({ default: m.ContactPage })),
);
export const SecurityRedirect = lazy(() =>
  import('@/pages/auth/SecurityRedirect').then((m) => ({ default: m.SecurityRedirect })),
);
export const ErrorPage = lazy(() =>
  import('@/pages/public/ErrorPage').then((m) => ({ default: m.ErrorPage })),
);
export const DashboardPage = lazy(() =>
  import('@/pages/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
export const ProductsPage = lazy(() =>
  import('@/pages/products/ProductsPage').then((m) => ({ default: m.ProductsPage })),
);
export const ProductCreatePage = lazy(() =>
  import('@/pages/products/ProductCreatePage').then((m) => ({ default: m.ProductCreatePage })),
);
export const ProductEditPage = lazy(() =>
  import('@/pages/products/ProductEditPage').then((m) => ({ default: m.ProductEditPage })),
);
export const VehiclesPage = lazy(() =>
  import('@/pages/vehicles/VehiclesPage').then((m) => ({ default: m.VehiclesPage })),
);
export const VehicleCreatePage = lazy(() =>
  import('@/pages/vehicles/VehicleCreatePage').then((m) => ({ default: m.VehicleCreatePage })),
);
export const VehicleEditPage = lazy(() =>
  import('@/pages/vehicles/VehicleEditPage').then((m) => ({ default: m.VehicleEditPage })),
);
export const LoadingPlansPage = lazy(() =>
  import('@/pages/plans/LoadingPlansPage').then((m) => ({ default: m.LoadingPlansPage })),
);
export const NewPlanPage = lazy(() =>
  import('@/pages/plans/NewPlanPage').then((m) => ({ default: m.NewPlanPage })),
);
export const ReportsPage = lazy(() =>
  import('@/pages/reports/ReportsPage').then((m) => ({ default: m.ReportsPage })),
);
export const ReportDetailPage = lazy(() =>
  import('@/pages/reports/ReportDetailPage').then((m) => ({ default: m.ReportDetailPage })),
);
export const ShareLinksPage = lazy(() =>
  import('@/pages/sharing/ShareLinksPage').then((m) => ({ default: m.ShareLinksPage })),
);
export const NotificationsPage = lazy(() =>
  import('@/pages/notifications/NotificationsPage').then((m) => ({ default: m.NotificationsPage })),
);
export const ERPItemsPage = lazy(() =>
  import('@/pages/erp/ERPItemsPage').then((m) => ({ default: m.ERPItemsPage })),
);
export const UnifiedSettingsPage = lazy(() =>
  import('@/pages/settings/UnifiedSettingsPage').then((m) => ({ default: m.UnifiedSettingsPage })),
);
