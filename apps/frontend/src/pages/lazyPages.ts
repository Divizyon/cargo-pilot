import { lazy } from 'react';

/**
 * Rota bileşenleri dinamik yüklenir; aksi halde landing ziyaretçisi de
 * three.js, gsap ve xlsx dahil tüm uygulamayı indirir.
 * Sayfalar named export olduğu için default'a sarılır.
 */

export const LandingPage = lazy(() =>
  import('@/pages/LandingPage').then((m) => ({ default: m.LandingPage })),
);
export const LoginPage = lazy(() =>
  import('@/pages/LoginPage').then((m) => ({ default: m.LoginPage })),
);
export const RegisterPage = lazy(() =>
  import('@/pages/RegisterPage').then((m) => ({ default: m.RegisterPage })),
);
export const AuthCallbackPage = lazy(() =>
  import('@/pages/AuthCallbackPage').then((m) => ({ default: m.AuthCallbackPage })),
);
export const ForgotPasswordPage = lazy(() =>
  import('@/pages/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })),
);
export const ResetPasswordPage = lazy(() =>
  import('@/pages/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })),
);
export const ConfirmEmailChangeRedirect = lazy(() =>
  import('@/pages/ConfirmEmailChangeRedirect').then((m) => ({
    default: m.ConfirmEmailChangeRedirect,
  })),
);
export const ConfirmEmailChangePage = lazy(() =>
  import('@/pages/ConfirmEmailChangePage').then((m) => ({ default: m.ConfirmEmailChangePage })),
);
export const ForceChangePasswordPage = lazy(() =>
  import('@/pages/ForceChangePasswordPage').then((m) => ({ default: m.ForceChangePasswordPage })),
);
export const SharePage = lazy(() =>
  import('@/pages/SharePage').then((m) => ({ default: m.SharePage })),
);
export const PrivacyPage = lazy(() =>
  import('@/pages/PrivacyPage').then((m) => ({ default: m.PrivacyPage })),
);
export const TermsPage = lazy(() =>
  import('@/pages/TermsPage').then((m) => ({ default: m.TermsPage })),
);
export const ContactPage = lazy(() =>
  import('@/pages/ContactPage').then((m) => ({ default: m.ContactPage })),
);
export const SecurityRedirect = lazy(() =>
  import('@/pages/SecurityRedirect').then((m) => ({ default: m.SecurityRedirect })),
);
export const ErrorPage = lazy(() =>
  import('@/pages/ErrorPage').then((m) => ({ default: m.ErrorPage })),
);
export const DashboardPage = lazy(() =>
  import('@/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
export const ProductsPage = lazy(() =>
  import('@/pages/ProductsPage').then((m) => ({ default: m.ProductsPage })),
);
export const ProductCreatePage = lazy(() =>
  import('@/pages/ProductCreatePage').then((m) => ({ default: m.ProductCreatePage })),
);
export const ProductEditPage = lazy(() =>
  import('@/pages/ProductEditPage').then((m) => ({ default: m.ProductEditPage })),
);
export const VehiclesPage = lazy(() =>
  import('@/pages/VehiclesPage').then((m) => ({ default: m.VehiclesPage })),
);
export const VehicleCreatePage = lazy(() =>
  import('@/pages/VehicleCreatePage').then((m) => ({ default: m.VehicleCreatePage })),
);
export const VehicleEditPage = lazy(() =>
  import('@/pages/VehicleEditPage').then((m) => ({ default: m.VehicleEditPage })),
);
export const LoadingPlansPage = lazy(() =>
  import('@/pages/LoadingPlansPage').then((m) => ({ default: m.LoadingPlansPage })),
);
export const NewPlanPage = lazy(() =>
  import('@/pages/NewPlanPage').then((m) => ({ default: m.NewPlanPage })),
);
export const ReportsPage = lazy(() =>
  import('@/pages/ReportsPage').then((m) => ({ default: m.ReportsPage })),
);
export const ReportDetailPage = lazy(() =>
  import('@/pages/ReportDetailPage').then((m) => ({ default: m.ReportDetailPage })),
);
export const ShareLinksPage = lazy(() =>
  import('@/pages/ShareLinksPage').then((m) => ({ default: m.ShareLinksPage })),
);
export const NotificationsPage = lazy(() =>
  import('@/pages/NotificationsPage').then((m) => ({ default: m.NotificationsPage })),
);
export const ERPItemsPage = lazy(() =>
  import('@/pages/ERPItemsPage').then((m) => ({ default: m.ERPItemsPage })),
);
export const UnifiedSettingsPage = lazy(() =>
  import('@/pages/UnifiedSettingsPage').then((m) => ({ default: m.UnifiedSettingsPage })),
);
