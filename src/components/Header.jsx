'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Building2, 
  Search, 
  Bell, 
  Calendar, 
  Coins, 
  LogOut,
  Menu,
  Download,
  WifiOff
} from 'lucide-react';
import { usePWA } from './PWAContext';
import NotificationCenter from './NotificationCenter';
import styles from './Header.module.css';

export default function Header({ 
  organization = { name: 'Levroun India Pvt. Ltd.', baseCurrency: 'INR' },
  user = { name: 'Adhurva (Architect)', role: 'OWNER' },
  onToggleSidebar
}) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const { isInstallable, isInstalled, isOnline, installApp } = usePWA();

  const currentYear = new Date().getFullYear();
  const fyString = `FY ${currentYear}-${(currentYear + 1).toString().slice(-2)}`;

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (e) {
      router.push('/login');
    }
  };

  return (
    <header className={styles.header}>
      <div className={styles.leftSection}>
        {onToggleSidebar && (
          <button 
            type="button" 
            className={styles.menuToggleBtn} 
            onClick={onToggleSidebar}
            aria-label="Open Navigation Menu"
          >
            <Menu size={20} />
          </button>
        )}

        <div className={styles.orgBadge}>
          <Building2 size={16} color="var(--color-deep-blue)" />
          <span className={styles.orgName}>{organization?.name || 'Levroun India Pvt. Ltd.'}</span>
        </div>

        <div className={styles.metaPill}>
          <Calendar size={12} />
          <span>{fyString}</span>
        </div>

        <div className={`${styles.metaPill} ${styles.currencyPill}`}>
          <Coins size={12} />
          <span>Base: {organization?.baseCurrency || 'INR'}</span>
        </div>

        <div className={styles.searchBox}>
          <Search size={14} color="#94A3B8" />
          <input 
            type="text" 
            placeholder="Search invoice, customer, SKU..." 
            className={styles.searchInput}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.rightSection}>
        {!isOnline && (
          <div 
            title="Offline - viewing cached data" 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 4, 
              fontSize: 11, 
              color: '#D97706',
              background: '#FEF3C7',
              padding: '2px 8px',
              borderRadius: 4,
              fontWeight: 600
            }}
          >
            <WifiOff size={13} />
            <span>Offline</span>
          </div>
        )}

        {!isInstalled && isInstallable && (
          <button 
            type="button" 
            className={styles.headerInstallBtn} 
            onClick={installApp}
            title="Install FinBilling ERP Desktop/Mobile App"
            id="btn-header-install"
          >
            <Download size={13} color="#38BDF8" />
            <span>Install App</span>
          </button>
        )}

        <NotificationCenter />

        <div className={styles.userProfile} onClick={handleLogout} title="Click to logout">
          <div className={styles.avatar}>
            {user?.name ? user.name.slice(0, 2).toUpperCase() : 'LE'}
          </div>
          <div>
            <div className={styles.userName}>{user?.name || 'Administrator'}</div>
            <div className={styles.userRole}>{user?.role || 'OWNER'}</div>
          </div>
          <LogOut size={14} color="#94A3B8" style={{ marginLeft: 6 }} />
        </div>
      </div>
    </header>
  );
}
