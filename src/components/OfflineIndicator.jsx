'use client';

import { usePWA } from './PWAContext';
import { WifiOff, RefreshCw } from 'lucide-react';
import styles from './OfflineIndicator.module.css';

export default function OfflineIndicator() {
  const { isOnline } = usePWA();

  if (isOnline) return null;

  return (
    <aside 
      className={styles.offlineToast} 
      role="status" 
      aria-live="polite"
      aria-label="Offline Mode Status"
    >
      <div className={styles.iconPulse}>
        <WifiOff size={15} color="#F4C542" />
      </div>
      <div className={styles.textContainer}>
        <span className={styles.statusTitle}>Offline Mode Active</span>
        <span className={styles.statusDesc}>Viewing cached data. New entries will sync when reconnected.</span>
      </div>
      <button 
        className={styles.retryBtn} 
        onClick={() => window.location.reload()}
        title="Check Connection"
        aria-label="Retry connection"
      >
        <RefreshCw size={12} />
        <span>Retry</span>
      </button>
    </aside>
  );
}
