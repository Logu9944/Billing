'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  CreditCard, 
  ShoppingBag, 
  Truck, 
  Receipt, 
  Package, 
  ArrowLeftRight, 
  Sliders, 
  BookOpen, 
  ScrollText, 
  Layers, 
  BarChart3, 
  Settings,
  ShieldCheck,
  X,
  Download
} from 'lucide-react';
import { usePWA } from './PWAContext';
import styles from './Sidebar.module.css';

export default function Sidebar({ isOpen, onClose }) {
  const pathname = usePathname();
  const { isInstalled, installApp } = usePWA();

  const isCurrent = (path) => {
    if (path === '/dashboard' && pathname === '/dashboard') return true;
    if (path !== '/dashboard' && pathname.startsWith(path)) return true;
    return false;
  };

  const navSections = [
    {
      title: null,
      items: [
        { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard }
      ]
    },
    {
      title: 'Sales',
      items: [
        { label: 'Invoices', path: '/sales/invoices', icon: FileText },
        { label: 'Customers', path: '/sales/customers', icon: Users },
        { label: 'Payments Received', path: '/sales/payments', icon: CreditCard }
      ]
    },
    {
      title: 'Purchases',
      items: [
        { label: 'Supplier Bills', path: '/purchases/bills', icon: ShoppingBag },
        { label: 'Suppliers', path: '/purchases/suppliers', icon: Truck },
        { label: 'Expenses', path: '/purchases/expenses', icon: Receipt }
      ]
    },
    {
      title: 'Inventory',
      items: [
        { label: 'Products & Services', path: '/inventory/products', icon: Package },
        { label: 'Stock Movements', path: '/inventory/movements', icon: ArrowLeftRight },
        { label: 'Stock Adjustments', path: '/inventory/adjustments', icon: Sliders }
      ]
    },
    {
      title: 'Accounting',
      items: [
        { label: 'Ledgers', path: '/accounting/ledgers', icon: BookOpen },
        { label: 'Journal Entries', path: '/accounting/journal', icon: ScrollText },
        { label: 'Chart of Accounts', path: '/accounting/chart-of-accounts', icon: Layers }
      ]
    },
    {
      title: 'Management',
      items: [
        { label: 'Financial Reports', path: '/reports', icon: BarChart3 },
        { label: 'Organization Settings', path: '/settings', icon: Settings },
        { label: 'Audit Trail', path: '/audit', icon: ShieldCheck }
      ]
    }
  ];

  const handleLinkClick = () => {
    if (onClose) onClose();
  };

  return (
    <>
      {isOpen && (
        <div 
          className={styles.backdrop} 
          onClick={onClose} 
          aria-hidden="true" 
        />
      )}

      <aside className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.brand}>
          <div className={styles.brandContent}>
            <div className={styles.brandLogo}>L</div>
            <div>
              <div className={styles.brandTitle}>LEVROUN ERP</div>
              <div className={styles.brandSub}>Enterprise Finance</div>
            </div>
          </div>
          {onClose && (
            <button 
              className={styles.closeDrawerBtn} 
              onClick={onClose}
              aria-label="Close navigation"
            >
              <X size={18} />
            </button>
          )}
        </div>

        <nav className={styles.navContainer}>
          {navSections.map((section, idx) => (
            <div key={idx}>
              {section.title && <div className={styles.sectionTitle}>{section.title}</div>}
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isCurrent(item.path);
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    onClick={handleLinkClick}
                    className={`${styles.navItem} ${active ? styles.navItemActive : ''}`}
                  >
                    <Icon size={16} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className={styles.footer}>
          {!isInstalled && (
            <button 
              type="button" 
              className={styles.installSidebarBtn} 
              onClick={() => {
                if (onClose) onClose();
                installApp();
              }}
              title="Install App on Device"
            >
              <Download size={13} />
              <span>Install App</span>
            </button>
          )}
          <div>Levroun India Pvt. Ltd.</div>
          <div>v1.0.0 Production PWA</div>
        </div>
      </aside>
    </>
  );
}
