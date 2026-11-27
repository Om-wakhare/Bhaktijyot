import { useCallback, useEffect, useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../../services/apiClient';
import {
  LayoutDashboard, ShoppingBag, Package, Tag, FileCheck, Settings, CalendarCheck,
  LogOut, Sparkles, Menu, X, ChevronRight, Plus, List, RefreshCw, MessageSquare,
} from 'lucide-react';
import { useAuth } from '../../services/auth';
import { ToastProvider } from '../admin/Toast';
import { ConfirmProvider } from '../admin/ConfirmDialog';
import { ADMIN_COUNTS_EVENT } from '../admin/adminUtils';

const NAV = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingBag },
  { href: '/admin/consultations', label: 'Consultations', icon: CalendarCheck, badgeKey: 'consultations' },
  { href: '/admin/reviews', label: 'Reviews', icon: MessageSquare, badgeKey: 'reviews' },
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

/** Exact match, or a nested path below href (query strings never affect pathname). */
function pathMatches(pathname, href) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Among sibling links, the longest matching href wins (so /products/add beats /products). */
function activeChildHref(pathname, children) {
  return children
    .filter((c) => pathMatches(pathname, c.href))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
}

function NavBadge({ count }) {
  if (!count || count <= 0) return null;
  return (
    <span className="min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full text-[10px] font-bold bg-amber-500 text-white">
      {count > 99 ? '99+' : count}
    </span>
  );
}

function SidebarLink({ href, label, icon: Icon, exact, badge }) {
  const { pathname } = useLocation();
  const active = exact ? pathname === href || pathname === `${href}/` : pathMatches(pathname, href);
  return (
    <Link
      to={href}
      aria-current={active ? 'page' : undefined}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
        active
          ? 'bg-primary text-white shadow-sm'
          : 'text-stone-400 hover:text-white hover:bg-white/8'
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1">{label}</span>
      <NavBadge count={badge} />
    </Link>
  );
}

function NavGroup({ item }) {
  const { pathname } = useLocation();
  const activeHref = activeChildHref(pathname, item.children);
  const isActive = Boolean(activeHref);
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
        aria-expanded={open}
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
            const active = child.href === activeHref;
            return (
              <Link
                key={child.href}
                to={child.href}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  active
                    ? 'bg-primary text-white'
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

function Sidebar({ onClose, variant, counts }) {
  const { logout } = useAuth();
  const navigate = useNavigate();

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
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="text-stone-500 hover:text-white transition-colors"
          >
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
              href={item.href}
              label={item.label}
              icon={item.icon}
              exact={item.exact}
              badge={item.badgeKey ? counts[item.badgeKey] : undefined}
            />
          ),
        )}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-white/8 space-y-1">
        <Link
          to="/"
          target="_blank"
          rel="noopener noreferrer"
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

/** Sidebar badge counts; refreshed on mount and whenever a page dispatches ADMIN_COUNTS_EVENT. */
function useAdminCounts() {
  const [counts, setCounts] = useState({ reviews: 0, consultations: 0 });

  const refresh = useCallback(() => {
    api.get('/reviews/admin', { params: { approved: false, limit: 1 } })
      .then((res) => setCounts((c) => ({ ...c, reviews: res.data?.total || 0 })))
      .catch(() => {});
    api.get('/consultations', { params: { status_filter: 'new', limit: 1 } })
      .then((res) => setCounts((c) => ({ ...c, consultations: res.data?.total || 0 })))
      .catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener(ADMIN_COUNTS_EVENT, refresh);
    return () => window.removeEventListener(ADMIN_COUNTS_EVENT, refresh);
  }, [refresh]);

  return counts;
}

export function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const counts = useAdminCounts();

  useEffect(() => { setMobileOpen(false); }, [location.pathname, location.search]);

  return (
    <ToastProvider>
      <ConfirmProvider>
        <div className="min-h-screen flex bg-stone-100">
          {/* Desktop sidebar */}
          <div className="hidden lg:flex flex-col w-60 shrink-0 sticky top-0 h-screen">
            <Sidebar variant="desktop" counts={counts} />
          </div>

          {/* Mobile overlay */}
          {mobileOpen && (
            <div className="lg:hidden fixed inset-0 z-50 flex">
              <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
              <div className="relative w-60 h-full">
                <Sidebar variant="mobile" counts={counts} onClose={() => setMobileOpen(false)} />
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
                aria-label="Open menu"
                className="relative h-9 w-9 flex items-center justify-center text-stone-400 hover:text-white transition-colors"
              >
                <Menu className="h-5 w-5" />
                {(counts.reviews > 0 || counts.consultations > 0) && (
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-amber-500" aria-hidden="true" />
                )}
              </button>
            </div>

            <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
              <Outlet />
            </div>
          </main>
        </div>
      </ConfirmProvider>
    </ToastProvider>
  );
}
