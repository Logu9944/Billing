'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  Bell, 
  AlertTriangle, 
  CheckCircle2, 
  FileText, 
  Coins, 
  X,
  Volume2
} from 'lucide-react';
import styles from './NotificationCenter.module.css';

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasPushPermission, setHasPushPermission] = useState(false);
  const dropdownRef = useRef(null);

  const [notifications, setNotifications] = useState([
    {
      id: 'notif-1',
      title: 'Low Stock Alert',
      desc: 'Physical Goods SKU-PRD-01 is below reorder threshold (8 units left).',
      time: '10m ago',
      unread: true,
      type: 'warning',
      href: '/inventory/products'
    },
    {
      id: 'notif-2',
      title: 'USD Forex Rate Synced',
      desc: 'Central Bank live exchange rate pegged @ 1 USD = ₹85.50 INR.',
      time: '1h ago',
      unread: true,
      type: 'info',
      href: '/settings'
    },
    {
      id: 'notif-3',
      title: 'POS Hardware Ready',
      desc: '80mm Standard and 58mm Mobile Thermal slip engine operational.',
      time: '3h ago',
      unread: false,
      type: 'success',
      href: '/sales/invoices'
    }
  ]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setHasPushPermission(Notification.permission === 'granted');
    }

    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => n.unread).length;

  const requestPush = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setHasPushPermission(true);
        new Notification('FinBilling Push Alerts Enabled', {
          body: 'You will receive real-time notifications for payment receipts and low stock alerts.',
          icon: '/icons/icon-192.png'
        });
      }
    } catch (e) {
      console.warn('Push permission request error:', e);
    }
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
  };

  const getIcon = (type) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle size={15} color="#D97706" />;
      case 'info':
        return <Coins size={15} color="#2563EB" />;
      case 'success':
        return <CheckCircle2 size={15} color="#059669" />;
      default:
        return <FileText size={15} color="#64748B" />;
    }
  };

  const getIconBg = (type) => {
    switch (type) {
      case 'warning':
        return '#FFFBEB';
      case 'info':
        return '#EFF6FF';
      case 'success':
        return '#ECFDF5';
      default:
        return '#F1F5F9';
    }
  };

  return (
    <div className={styles.container} ref={dropdownRef}>
      <button 
        type="button"
        className={styles.bellButton} 
        onClick={() => setIsOpen(!isOpen)}
        title="Notifications"
        aria-label="Open notifications"
        id="btn-header-notifications"
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className={styles.badge}>{unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          <div className={styles.header}>
            <div className={styles.title}>
              <span>System Notifications</span>
              {unreadCount > 0 && (
                <span style={{ fontSize: 11, color: '#DC2626', fontWeight: 600 }}>({unreadCount} new)</span>
              )}
            </div>
            {unreadCount > 0 && (
              <button 
                type="button" 
                className={styles.clearBtn} 
                onClick={markAllAsRead}
              >
                Mark all read
              </button>
            )}
          </div>

          {!hasPushPermission && typeof window !== 'undefined' && 'Notification' in window && (
            <div className={styles.pushBanner}>
              <div className={styles.pushText}>
                <strong>Get Push Alerts</strong>
                <div>Receive stock & invoice alerts even when app is closed.</div>
              </div>
              <button 
                type="button" 
                className={styles.enablePushBtn} 
                onClick={requestPush}
                id="btn-enable-push"
              >
                Enable
              </button>
            </div>
          )}

          <div className={styles.list}>
            {notifications.length === 0 ? (
              <div className={styles.emptyState}>No notifications right now</div>
            ) : (
              notifications.map((n) => (
                <Link
                  key={n.id}
                  href={n.href}
                  onClick={() => setIsOpen(false)}
                  className={`${styles.item} ${n.unread ? styles.itemUnread : ''}`}
                >
                  <div 
                    className={styles.itemIcon} 
                    style={{ backgroundColor: getIconBg(n.type) }}
                  >
                    {getIcon(n.type)}
                  </div>
                  <div className={styles.itemContent}>
                    <div className={styles.itemTitle}>{n.title}</div>
                    <div className={styles.itemDesc}>{n.desc}</div>
                    <div className={styles.itemTime}>{n.time}</div>
                  </div>
                </Link>
              ))
            )}
          </div>

          <div className={styles.footer}>
            FinBilling Real-Time Alert Engine
          </div>
        </div>
      )}
    </div>
  );
}
