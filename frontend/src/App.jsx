import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PublicLayout } from './components/layouts/PublicLayout';
import { AdminLayout } from './components/layouts/AdminLayout';

// Public pages. The shopping core (home, list, product) is in the first download;
// everything else loads on demand so phones fetch less JavaScript up front.
import { HomePage } from './pages/public/HomePage';
import { ProductsPage } from './pages/public/ProductsPage';
import { ProductDetailPage } from './pages/public/ProductDetailPage';
const page = (loader, name) => lazy(() => loader().then((m) => ({ default: m[name] })));
const CategoriesPage = page(() => import('./pages/public/CategoriesPage'), 'CategoriesPage');
const CartPage = page(() => import('./pages/public/CartPage'), 'CartPage');
const CheckoutPage = page(() => import('./pages/public/CheckoutPage'), 'CheckoutPage');
const OrderSuccessPage = page(() => import('./pages/public/OrderSuccessPage'), 'OrderSuccessPage');
const OrderTrackingPage = page(() => import('./pages/public/OrderTrackingPage'), 'OrderTrackingPage');
const AboutPage = page(() => import('./pages/public/AboutPage'), 'AboutPage');
const ContactPage = page(() => import('./pages/public/ContactPage'), 'ContactPage');
const VerifyCertificatePage = page(() => import('./pages/public/VerifyCertificatePage'), 'VerifyCertificatePage');
const WishlistPage = page(() => import('./pages/public/WishlistPage'), 'WishlistPage');
const ConsultPage = page(() => import('./pages/public/ConsultPage'), 'ConsultPage');
const NotFoundPage = page(() => import('./pages/public/NotFoundPage'), 'NotFoundPage');
const PrivacyPolicyPage = page(() => import('./pages/public/PrivacyPolicyPage'), 'PrivacyPolicyPage');
const TermsPage = page(() => import('./pages/public/TermsPage'), 'TermsPage');
const ShippingReturnsPage = page(() => import('./pages/public/ShippingReturnsPage'), 'ShippingReturnsPage');

// Admin pages — code-split; only downloaded when the admin visits /admin
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
const AdminDashboardPage          = lazy(() => import('./pages/admin/AdminDashboardPage').then(m => ({ default: m.AdminDashboardPage })));
const AdminManageCategoriesPage   = lazy(() => import('./pages/admin/AdminManageCategoriesPage').then(m => ({ default: m.AdminManageCategoriesPage })));
const AdminAddCategoryPage        = lazy(() => import('./pages/admin/AdminAddCategoryPage').then(m => ({ default: m.AdminAddCategoryPage })));
const AdminManageProductsPage     = lazy(() => import('./pages/admin/AdminManageProductsPage').then(m => ({ default: m.AdminManageProductsPage })));
const AdminAddProductPage         = lazy(() => import('./pages/admin/AdminAddProductPage').then(m => ({ default: m.AdminAddProductPage })));
const AdminBulkUploadPage         = lazy(() => import('./pages/admin/AdminBulkUploadPage').then(m => ({ default: m.AdminBulkUploadPage })));
const AdminEditProductPage        = lazy(() => import('./pages/admin/AdminEditProductPage').then(m => ({ default: m.AdminEditProductPage })));
const AdminManageCertificatesPage = lazy(() => import('./pages/admin/AdminManageCertificatesPage').then(m => ({ default: m.AdminManageCertificatesPage })));
const AdminGenerateCertificatePage = lazy(() => import('./pages/admin/AdminGenerateCertificatePage').then(m => ({ default: m.AdminGenerateCertificatePage })));
const AdminSettingsPage           = lazy(() => import('./pages/admin/AdminSettingsPage').then(m => ({ default: m.AdminSettingsPage })));
const AdminOrdersPage             = lazy(() => import('./pages/admin/AdminOrdersPage').then(m => ({ default: m.AdminOrdersPage })));
const AdminManageReviewsPage      = lazy(() => import('./pages/admin/AdminManageReviewsPage').then(m => ({ default: m.AdminManageReviewsPage })));
const AdminConsultationsPage      = lazy(() => import('./pages/admin/AdminConsultationsPage').then(m => ({ default: m.AdminConsultationsPage })));

import { useAuth } from './services/auth';
import { CartProvider } from './services/cart';
import { WishlistProvider } from './services/wishlist';
import { SiteConfigProvider } from './services/siteConfig';

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated()) return <Navigate to="/admin/login" replace />;
  return children;
}

const PageFallback = () => (
  <div role="status" className="flex items-center justify-center min-h-[50vh] text-sm text-espresso/60">
    Loading…
  </div>
);

const AdminFallback = () => (
  <div className="flex items-center justify-center min-h-[40vh] text-sm text-espresso/40">
    Loading...
  </div>
);

export default function App() {
  return (
    <ErrorBoundary>
      <SiteConfigProvider>
      <CartProvider>
        <WishlistProvider>
          <Routes>
            {/* Public site */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/categories" element={<Suspense fallback={<PageFallback />}><CategoriesPage /></Suspense>} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/products/:id" element={<ProductDetailPage />} />
              <Route path="/wishlist" element={<Suspense fallback={<PageFallback />}><WishlistPage /></Suspense>} />
              <Route path="/about" element={<Suspense fallback={<PageFallback />}><AboutPage /></Suspense>} />
              <Route path="/contact" element={<Suspense fallback={<PageFallback />}><ContactPage /></Suspense>} />
              <Route path="/verify" element={<Suspense fallback={<PageFallback />}><VerifyCertificatePage /></Suspense>} />
              <Route path="/cart" element={<Suspense fallback={<PageFallback />}><CartPage /></Suspense>} />
              <Route path="/checkout" element={<Suspense fallback={<PageFallback />}><CheckoutPage /></Suspense>} />
              <Route path="/order-success" element={<Suspense fallback={<PageFallback />}><OrderSuccessPage /></Suspense>} />
              <Route path="/track-order" element={<Suspense fallback={<PageFallback />}><OrderTrackingPage /></Suspense>} />
              <Route path="/consult" element={<Suspense fallback={<PageFallback />}><ConsultPage /></Suspense>} />
              <Route path="/privacy" element={<Suspense fallback={<PageFallback />}><PrivacyPolicyPage /></Suspense>} />
              <Route path="/terms" element={<Suspense fallback={<PageFallback />}><TermsPage /></Suspense>} />
              <Route path="/shipping-returns" element={<Suspense fallback={<PageFallback />}><ShippingReturnsPage /></Suspense>} />
              <Route path="*" element={<Suspense fallback={<PageFallback />}><NotFoundPage /></Suspense>} />
            </Route>

            {/* Admin */}
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Suspense fallback={<AdminFallback />}><AdminDashboardPage /></Suspense>} />
              <Route path="categories" element={<Suspense fallback={<AdminFallback />}><AdminManageCategoriesPage /></Suspense>} />
              <Route path="categories/add" element={<Suspense fallback={<AdminFallback />}><AdminAddCategoryPage /></Suspense>} />
              <Route path="products" element={<Suspense fallback={<AdminFallback />}><AdminManageProductsPage /></Suspense>} />
              <Route path="products/add" element={<Suspense fallback={<AdminFallback />}><AdminAddProductPage /></Suspense>} />
              <Route path="products/bulk" element={<Suspense fallback={<AdminFallback />}><AdminBulkUploadPage /></Suspense>} />
              <Route path="products/:id/edit" element={<Suspense fallback={<AdminFallback />}><AdminEditProductPage /></Suspense>} />
              <Route path="reviews" element={<Suspense fallback={<AdminFallback />}><AdminManageReviewsPage /></Suspense>} />
              <Route path="certificates" element={<Suspense fallback={<AdminFallback />}><AdminManageCertificatesPage /></Suspense>} />
              <Route path="certificates/generate" element={<Suspense fallback={<AdminFallback />}><AdminGenerateCertificatePage /></Suspense>} />
              <Route path="settings" element={<Suspense fallback={<AdminFallback />}><AdminSettingsPage /></Suspense>} />
              <Route path="orders" element={<Suspense fallback={<AdminFallback />}><AdminOrdersPage /></Suspense>} />
              <Route path="consultations" element={<Suspense fallback={<AdminFallback />}><AdminConsultationsPage /></Suspense>} />
            </Route>
          </Routes>
        </WishlistProvider>
      </CartProvider>
      </SiteConfigProvider>
    </ErrorBoundary>
  );
}
