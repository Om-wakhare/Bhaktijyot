import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PublicLayout } from './components/layouts/PublicLayout';
import { AdminLayout } from './components/layouts/AdminLayout';

// Public pages — eagerly bundled (part of the initial load)
import { HomePage } from './pages/public/HomePage';
import { CategoriesPage } from './pages/public/CategoriesPage';
import { ProductsPage } from './pages/public/ProductsPage';
import { ProductDetailPage } from './pages/public/ProductDetailPage';
import { CartPage } from './pages/public/CartPage';
import { CheckoutPage } from './pages/public/CheckoutPage';
import { OrderSuccessPage } from './pages/public/OrderSuccessPage';
import { OrderTrackingPage } from './pages/public/OrderTrackingPage';
import { AboutPage } from './pages/public/AboutPage';
import { ContactPage } from './pages/public/ContactPage';
import { VerifyCertificatePage } from './pages/public/VerifyCertificatePage';
import { WishlistPage } from './pages/public/WishlistPage';
import { ConsultPage } from './pages/public/ConsultPage';
import { NotFoundPage } from './pages/public/NotFoundPage';

// Admin pages — code-split; only downloaded when the admin visits /admin
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
const AdminDashboardPage          = lazy(() => import('./pages/admin/AdminDashboardPage').then(m => ({ default: m.AdminDashboardPage })));
const AdminManageCategoriesPage   = lazy(() => import('./pages/admin/AdminManageCategoriesPage').then(m => ({ default: m.AdminManageCategoriesPage })));
const AdminAddCategoryPage        = lazy(() => import('./pages/admin/AdminAddCategoryPage').then(m => ({ default: m.AdminAddCategoryPage })));
const AdminManageProductsPage     = lazy(() => import('./pages/admin/AdminManageProductsPage').then(m => ({ default: m.AdminManageProductsPage })));
const AdminAddProductPage         = lazy(() => import('./pages/admin/AdminAddProductPage').then(m => ({ default: m.AdminAddProductPage })));
const AdminEditProductPage        = lazy(() => import('./pages/admin/AdminEditProductPage').then(m => ({ default: m.AdminEditProductPage })));
const AdminManageCertificatesPage = lazy(() => import('./pages/admin/AdminManageCertificatesPage').then(m => ({ default: m.AdminManageCertificatesPage })));
const AdminGenerateCertificatePage = lazy(() => import('./pages/admin/AdminGenerateCertificatePage').then(m => ({ default: m.AdminGenerateCertificatePage })));
const AdminSettingsPage           = lazy(() => import('./pages/admin/AdminSettingsPage').then(m => ({ default: m.AdminSettingsPage })));
const AdminOrdersPage             = lazy(() => import('./pages/admin/AdminOrdersPage').then(m => ({ default: m.AdminOrdersPage })));
const AdminManageReviewsPage      = lazy(() => import('./pages/admin/AdminManageReviewsPage').then(m => ({ default: m.AdminManageReviewsPage })));

import { useAuth } from './services/auth';
import { CartProvider } from './services/cart';
import { WishlistProvider } from './services/wishlist';

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated()) return <Navigate to="/admin/login" replace />;
  return children;
}

const AdminFallback = () => (
  <div className="flex items-center justify-center min-h-[40vh] text-sm text-espresso/40">
    Loading...
  </div>
);

export default function App() {
  return (
    <ErrorBoundary>
      <CartProvider>
        <WishlistProvider>
          <Routes>
            {/* Public site */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/categories" element={<CategoriesPage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/products/:id" element={<ProductDetailPage />} />
              <Route path="/wishlist" element={<WishlistPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/verify" element={<VerifyCertificatePage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/order-success" element={<OrderSuccessPage />} />
              <Route path="/track-order" element={<OrderTrackingPage />} />
              <Route path="/consult" element={<ConsultPage />} />
              <Route path="*" element={<NotFoundPage />} />
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
              <Route path="products/:id/edit" element={<Suspense fallback={<AdminFallback />}><AdminEditProductPage /></Suspense>} />
              <Route path="reviews" element={<Suspense fallback={<AdminFallback />}><AdminManageReviewsPage /></Suspense>} />
              <Route path="certificates" element={<Suspense fallback={<AdminFallback />}><AdminManageCertificatesPage /></Suspense>} />
              <Route path="certificates/generate" element={<Suspense fallback={<AdminFallback />}><AdminGenerateCertificatePage /></Suspense>} />
              <Route path="settings" element={<Suspense fallback={<AdminFallback />}><AdminSettingsPage /></Suspense>} />
              <Route path="orders" element={<Suspense fallback={<AdminFallback />}><AdminOrdersPage /></Suspense>} />
            </Route>
          </Routes>
        </WishlistProvider>
      </CartProvider>
    </ErrorBoundary>
  );
}
