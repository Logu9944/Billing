'use client';

import { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import MobileBottomNav from './MobileBottomNav';
import PWAInstallBanner from './PWAInstallBanner';
import OfflineIndicator from './OfflineIndicator';
import styles from './AppLayout.module.css';

export default function AppLayout({ children, title, subtitle, actions, organization, user }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className={styles.wrapper}>
      <OfflineIndicator />
      
      <Sidebar 
        isOpen={mobileMenuOpen} 
        onClose={() => setMobileMenuOpen(false)} 
      />
      
      <Header 
        organization={organization} 
        user={user} 
        onToggleSidebar={() => setMobileMenuOpen(prev => !prev)} 
      />

      <main className={styles.mainContent}>
        {(title || actions) && (
          <div className={styles.pageHeader}>
            <div>
              {title && <h1 className={styles.pageTitle}>{title}</h1>}
              {subtitle && <p className={styles.pageSubtitle}>{subtitle}</p>}
            </div>
            {actions && <div className={styles.pageActions}>{actions}</div>}
          </div>
        )}
        {children}
      </main>

      <MobileBottomNav onToggleSidebar={() => setMobileMenuOpen(prev => !prev)} />
      <PWAInstallBanner />
    </div>
  );
}
