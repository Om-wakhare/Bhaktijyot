import { useEffect, useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../services/auth';

function AdminNavLink({ to, children }) {
  const location = useLocation();
  const active = location.pathname === to || location.pathname === `/admin${to === '/admin' ? '' : to.replace('/admin', '')}`;
  return (
    <Link
      to={to}
      className={`block px-3 py-2 rounded-md text-sm font-medium ${
        active ? 'bg-primary text-white' : 'text-gray-200 hover:bg-primary hover:text-white'
      }`}
    >
      {children}
    </Link>
  );
}

function AdminSubLink({ to, children }) {
  const location = useLocation();
  const active = location.pathname === to;
  return (
    <Link
      to={to}
      className={`block px-3 py-1.5 rounded-md text-xs font-semibold ${
        active ? 'bg-white/10 text-white' : 'text-gray-300 hover:bg-white/10 hover:text-white'
      }`}
    >
      {children}
    </Link>
  );
}

function NavGroup({ title, open, onToggle, children }) {
  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-semibold text-gray-100 hover:bg-white/10"
      >
        <span>{title}</span>
        <span className="text-xs text-gray-300">{open ? '–' : '+'}</span>
      </button>
      {open && <div className="pl-3 space-y-1">{children}</div>}
    </div>
  );
}

export function AdminLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState(() => {
    if (location.pathname.includes('/categories')) return 'categories';
    if (location.pathname.includes('/certificates')) return 'certificates';
    if (location.pathname.includes('/products')) return 'products';
    return '';
  });

  useEffect(() => {
    if (mobileOpen) setMobileOpen(false);

    if (location.pathname.includes('/categories')) setOpenGroup('categories');
    else if (location.pathname.includes('/certificates')) setOpenGroup('certificates');
    else if (location.pathname.includes('/products')) setOpenGroup('products');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/admin/login', { replace: true });
  };

  const sidebarWidth = sidebarCollapsed ? 'w-20' : 'w-64';

  const Sidebar = ({ variant }) => (
    <aside className={`${sidebarWidth} bg-gray-900 text-gray-100 flex flex-col h-screen sticky top-0`}> 
      <div className="px-4 py-4 border-b border-gray-700 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-lg font-semibold truncate">{sidebarCollapsed ? 'BJ' : 'Bhaktijyot Admin'}</div>
          {!sidebarCollapsed && (
            <div className="text-xs text-gray-400">Single admin dashboard</div>
          )}
        </div>
        {variant === 'desktop' && (
          <button
            type="button"
            onClick={() => setSidebarCollapsed((v) => !v)}
            className="h-9 w-9 inline-flex items-center justify-center rounded-md bg-gray-800 hover:bg-gray-700 text-gray-100"
            aria-label="Toggle sidebar"
          >
            {sidebarCollapsed ? '›' : '‹'}
          </button>
        )}
        {variant === 'mobile' && (
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="h-9 w-9 inline-flex items-center justify-center rounded-md bg-gray-800 hover:bg-gray-700 text-gray-100"
            aria-label="Close menu"
          >
            ✕
          </button>
        )}
      </div>
      <nav className="flex-1 px-3 py-4 space-y-2 overflow-auto">
        <AdminNavLink to="/admin">Dashboard</AdminNavLink>

        <NavGroup
          title="Categories"
          open={openGroup === 'categories'}
          onToggle={() => setOpenGroup((g) => (g === 'categories' ? '' : 'categories'))}
        >
          <AdminSubLink to="/admin/categories">Manage</AdminSubLink>
          <AdminSubLink to="/admin/categories/add">Add category</AdminSubLink>
        </NavGroup>

        <NavGroup
          title="Products"
          open={openGroup === 'products'}
          onToggle={() => setOpenGroup((g) => (g === 'products' ? '' : 'products'))}
        >
          <AdminSubLink to="/admin/products">Manage</AdminSubLink>
          <AdminSubLink to="/admin/products/add">Add product</AdminSubLink>
        </NavGroup>

        <NavGroup
          title="Certificates"
          open={openGroup === 'certificates'}
          onToggle={() => setOpenGroup((g) => (g === 'certificates' ? '' : 'certificates'))}
        >
          <AdminSubLink to="/admin/certificates">Manage</AdminSubLink>
          <AdminSubLink to="/admin/certificates/generate">Generate</AdminSubLink>
        </NavGroup>

        <AdminNavLink to="/admin/settings">Settings</AdminNavLink>
      </nav>
      <button
        type="button"
        onClick={handleLogout}
        className={`m-4 mt-auto px-3 py-2 rounded-md bg-red-500 hover:bg-red-600 text-sm font-semibold ${
          sidebarCollapsed ? 'text-xs' : ''
        }`}
      >
        Logout
      </button>
    </aside>
  );

  return (
    <div className="min-h-screen flex bg-gray-100">
      <div className="hidden md:block">
        <Sidebar variant="desktop" />
      </div>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0">
            <Sidebar variant="mobile" />
          </div>
        </div>
      )}

      <main className="flex-1 min-w-0">
        <header className="bg-white shadow sticky top-0 z-30">
          <div className="px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="md:hidden h-10 w-10 inline-flex items-center justify-center rounded-md border border-gray-200 text-gray-700"
                aria-label="Open menu"
              >
                ☰
              </button>
              <h1 className="text-lg font-semibold text-gray-900">Admin Panel</h1>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to="/admin/settings"
                className="px-3 py-2 rounded-md text-sm font-semibold border border-gray-200 text-gray-700 hover:border-primary"
              >
                Settings
              </Link>
            </div>
          </div>
        </header>
        <div className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

