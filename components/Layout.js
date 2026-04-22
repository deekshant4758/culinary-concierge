// components/Layout.js
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

const NAV_ITEMS = [
  { href: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
  { href: '/restaurants', icon: 'restaurant', label: 'Restaurants' },
  { href: '/orders', icon: 'receipt_long', label: 'Orders' },
];

const ADMIN_NAV = [
  { href: '/payment-settings', icon: 'payments', label: 'Payment Settings' },
];

export default function Layout({ children, user }) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const regionBadge = {
    india: 'badge-india',
    america: 'badge-america',
    global: 'badge-global',
  }[user?.region || 'global'];

  return (
    <div className="min-h-screen bg-surface text-on-surface">

      {/* Sidebar */}
      <aside
        className={[
          'fixed top-0 left-0 h-screen w-64 bg-surface-container-low z-40',
          'flex flex-col py-8 px-4 transition-transform duration-300',
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        ].join(' ')}
      >
        <div className="mb-8 px-2">
          <h2 className="font-headline font-black text-primary text-xl">Culinary Concierge</h2>
          <div className="flex items-center gap-2 mt-2">
            <span className={`badge text-xs ${regionBadge}`}>{user?.region || 'global'}</span>
            <span className="text-xs text-outline capitalize font-medium">{user?.role}</span>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          {NAV_ITEMS.map(item => {
            const isActive = router.pathname === item.href;
            return (
              <Link key={item.href} href={item.href}
                className={isActive ? 'sidebar-link-active' : 'sidebar-link'}>
                <span className="material-symbols-outlined">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
          {user?.role === 'admin' && ADMIN_NAV.map(item => {
            const isActive = router.pathname === item.href;
            return (
              <Link key={item.href} href={item.href}
                className={isActive ? 'sidebar-link-active' : 'sidebar-link'}>
                <span className="material-symbols-outlined">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto pt-4 border-t border-outline-variant/30 space-y-2">
          <div className="px-4 py-2">
            <p className="text-sm font-bold text-on-surface">{user?.name}</p>
            <p className="text-xs text-outline">{user?.email}</p>
          </div>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-all text-sm font-medium">
            <span className="material-symbols-outlined">logout</span>
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setMobileOpen(false)} />
      )}

      {/* Main column — shifted right of sidebar on md+ */}
      <div className="md:ml-64 flex flex-col min-h-screen">

        {/* Fixed top bar */}
        <header className="fixed top-0 left-0 md:left-64 right-0 z-20 h-16
          bg-white/80 backdrop-blur-md border-b border-outline-variant/20
          px-6 flex items-center justify-between">
          <button className="md:hidden p-2 rounded-lg"
            onClick={() => setMobileOpen(!mobileOpen)}>
            <span className="material-symbols-outlined">menu</span>
          </button>
          <div className="hidden md:block" />
          <div className="flex items-center gap-3">
            <Link href="/orders"
              className="p-2 hover:bg-surface-container rounded-full transition-colors">
              <span className="material-symbols-outlined text-primary">shopping_cart</span>
            </Link>
            <div className="flex items-center gap-2 pl-3 border-l border-outline-variant/30">
              <div className="w-9 h-9 rounded-full bg-primary-container flex items-center justify-center text-white text-sm font-bold">
                {user?.name?.[0] || 'U'}
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-bold text-on-surface leading-tight">{user?.name}</p>
                <p className="text-[10px] text-outline capitalize">{user?.role} · {user?.region}</p>
              </div>
            </div>
          </div>
        </header>

        {/*
          Spacer: same height as the fixed header (h-16 = 64px).
          This is a normal-flow element so page content starts below the bar.
          DO NOT use pt-16 on main — that interacts badly with p-8.
        */}
        <div style={{ height: '64px', flexShrink: 0 }} />

        <main className="flex-1 p-6 md:p-8">
          {children}
        </main>

        <footer className="border-t border-outline-variant/20 py-4 px-8 text-center text-xs text-outline">
          © 2026 Culinary Concierge Corp. All rights reserved.
        </footer>
      </div>
    </div>
  );
}
