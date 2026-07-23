import { useEffect, useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../../services/apiClient';
import {
  LayoutDashboard, ShoppingBag, Package, Tag, FileCheck, Settings,
  LogOut, Sparkles, Menu, X, ChevronRight, Plus, List, RefreshCw, MessageSquare,
} from 'lucide-react';
import { useAuth } from '../../services/auth';

const NAV = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingBag },
  { href: '/admin/reviews', label: 'Reviews', icon: MessageSquare },
  {
    label: 'Products', icon: Package,
    children: [
      { href: '/admin/products', label: 'Manage', icon: List },
      { href: '/admin/products/add', label: 'Add Product', icon: Plus },
    ],
  },
  {
    label: 'Categories', icon: Tag,
    children: [
      { href: '/admin/categories', label: 'Manage', icon: List },
      { href: '/admin/categories/add', label: 'Add Category', icon: Plus },
    ],
  },
  {
    label: 'Certificates', icon: FileCheck,
    children: [
      { href: '/admin/certificates', label: 'Manage', icon: List },
      { href: '/admin/certificates/generate', label: 'Generate', icon: RefreshCw },
    ],
  },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

function SidebarLink({ href, label, icon: Icon, exact, badge }) {
  const location = useLocation();
  const active = exact ? location.pathname === href : location.pathname === href;
  return (
    <Link
      to={href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
        active
          ? 'bg-primary text-white shadow-sm'
          : 'text-stone-400 hover:text-white hover:bg-white/8'
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1">{label}</span>
      {badge > 0 && (
        <span className="min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full text-[10px] font-bold bg-amber-500 text-white">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </Link>
  );
}

function NavGroup({ item }) {
  const location = useLocation();
  const isActive = item.children?.some((c) => location.pathname === c.href);
  const [open, setOpen] = useState(isActive);

  useEffect(() => {
    if (isActive) setOpen(true);
  }, [isActive]);

  const Icon = item.icon;

  return (
    <div className="space-y-0.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
          isActive ? 'text-white' : 'text-stone-400 hover:text-white hover:bg-white/8'
        }`}
      >
        <span className="flex items-center gap-3">
          <Icon className="h-4 w-4 shrink-0" />
          {item.label}
        </span>
        <ChevronRight className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && (
        <div className="pl-9 space-y-0.5">
          {item.children.map((child) => {
            const ChildIcon = child.icon;
            const active = location.pathname === child.href;
            return (
              <Link
                key={child.href}
                to={child.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  active
                    ? 'bg-primary/20 text-primary'
                    : 'text-stone-500 hover:text-stone-200 hover:bg-white/5'
                }`}
              >
                <ChildIcon className="h-3.5 w-3.5 shrink-0" />
                {child.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Sidebar({ onClose, variant }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [pendingReviews, setPendingReviews] = useState(0);

  useEffect(() => {
    api.get('/reviews/admin', { params: { approved: false, limit: 1 } })
      .then((res) => setPendingReviews(res.data?.total || 0))
      .catch(() => {});
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/admin/login', { replace: true });
  };

  return (
    <aside className="w-60 bg-espresso flex flex-col h-full">
      {/* Brand */}
      <div className="px-4 py-5 border-b border-white/8 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div>
            <div className="text-sm font-bold text-white leading-tight">Bhaktijyot</div>
            <div className="text-[10px] text-stone-500 font-medium uppercase tracking-wider">Admin Panel</div>
          </div>
        </div>
        {variant === 'mobile' && onClose && (
          <button type="button" onClick={onClose} className="text-stone-500 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map((item) =>
          item.children ? (
            <NavGroup key={item.label} item={item} />
          ) : (
            <SidebarLink
              key={item.href}
              {...item}
              badge={item.href === '/admin/reviews' ? pendingReviews : undefined}
            />
          ),
        )}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-white/8 space-y-1">
        <Link
          to="/"
          target="_blank"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-stone-400 hover:text-white hover:bg-white/8 transition-all"
        >
          <ChevronRight className="h-4 w-4" />
          View Store
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-stone-400 hover:text-red-400 hover:bg-red-400/10 transition-all"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}

export function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  return (
    <div className="min-h-screen flex bg-stone-100">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-col w-60 shrink-0 sticky top-0 h-screen">
        <Sidebar variant="desktop" />
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <div className="relative w-60 h-full">
            <Sidebar variant="mobile" onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 min-w-0">
        {/* Mobile top bar */}
        <div className="lg:hidden bg-espresso border-b border-white/8 flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-bold text-white">Bhaktijyot Admin</span>
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="h-9 w-9 flex items-center justify-center text-stone-400 hover:text-white transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 lg:p-8 max-w-6xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
