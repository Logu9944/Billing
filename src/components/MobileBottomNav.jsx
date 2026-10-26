'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FileText, Plus, Package, Menu } from 'lucide-react';
import styles from './MobileBottomNav.module.css';

export default function MobileBottomNav({ onToggleSidebar }) {
  const pathname = usePathname();

  const isCurrent = (path) => {
    if (path === '/dashboard' && pathname === '/dashboard') return true;
    if (path !== '/dashboard' && pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <nav className={styles.bottomBar} aria-label="Mobile Navigation">
      <Link 
        href="/dashboard" 
        className={`${styles.navItem} ${isCurrent('/dashboard') ? styles.navItemActive : ''}`}
      >
        <LayoutDashboard size={20} />
        <span>Home</span>
      </Link>

      <Link 
        href="/sales/invoices" 
        className={`${styles.navItem} ${isCurrent('/sales/invoices') ? styles.navItemActive : ''}`}
      >
        <FileText size={20} />
        <span>Invoices</span>
      </Link>

      <Link 
        href="/sales/invoices/new" 
        className={styles.centerActionBtn}
        title="Create New Invoice"
        aria-label="Create New Invoice"
      >
        <Plus size={22} strokeWidth={2.5} />
      </Link>

      <Link 
        href="/inventory/products" 
        className={`${styles.navItem} ${isCurrent('/inventory/products') ? styles.navItemActive : ''}`}
      >
        <Package size={20} />
        <span>Inventory</span>
      </Link>

      <button 
        type="button"
        className={styles.navItem} 
        onClick={onToggleSidebar}
        aria-label="Toggle Navigation Drawer"
      >
        <Menu size={20} />
        <span>Menu</span>
      </button>
    </nav>
  );
}
