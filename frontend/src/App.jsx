import { Routes, Route, Navigate } from 'react-router-dom';
import { PublicLayout } from './components/layouts/PublicLayout';
import { AdminLayout } from './components/layouts/AdminLayout';
import { HomePage } from './pages/public/HomePage';
import { CategoriesPage } from './pages/public/CategoriesPage';
import { ProductsPage } from './pages/public/ProductsPage';
import { ProductDetailPage } from './pages/public/ProductDetailPage';
import { AboutPage } from './pages/public/AboutPage';
import { ContactPage } from './pages/public/ContactPage';
import { VerifyCertificatePage } from './pages/public/VerifyCertificatePage';
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminManageCategoriesPage } from './pages/admin/AdminManageCategoriesPage';
import { AdminAddCategoryPage } from './pages/admin/AdminAddCategoryPage';
import { AdminManageProductsPage } from './pages/admin/AdminManageProductsPage';
import { AdminAddProductPage } from './pages/admin/AdminAddProductPage';
import { AdminManageCertificatesPage } from './pages/admin/AdminManageCertificatesPage';
import { AdminGenerateCertificatePage } from './pages/admin/AdminGenerateCertificatePage';
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage';
import { useAuth } from './services/auth';

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated()) {
    return <Navigate to="/admin/login" replace />;
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      {/* Public site */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/products/:id" element={<ProductDetailPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/verify" element={<VerifyCertificatePage />} />
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
        <Route index element={<AdminDashboardPage />} />
        <Route path="categories" element={<AdminManageCategoriesPage />} />
        <Route path="categories/add" element={<AdminAddCategoryPage />} />
        <Route path="products" element={<AdminManageProductsPage />} />
        <Route path="products/add" element={<AdminAddProductPage />} />
        <Route path="certificates" element={<AdminManageCertificatesPage />} />
        <Route path="certificates/generate" element={<AdminGenerateCertificatePage />} />
        <Route path="settings" element={<AdminSettingsPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

