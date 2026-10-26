'use client';

import { useState, useEffect } from 'react';
import { usePWA } from './PWAContext';
import { Download, X, Smartphone, Share, PlusSquare, Sparkles, CheckCircle2 } from 'lucide-react';
import styles from './PWAInstallBanner.module.css';

export default function PWAInstallBanner() {
  const { 
    isInstallable, 
    isInstalled, 
    isIOS, 
    installApp, 
    showInstallModal, 
    setShowInstallModal 
  } = usePWA();

  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if dismissed in this session
    const isDismissed = sessionStorage.getItem('finbilling_pwa_dismissed');
    if (isDismissed) {
      setDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('finbilling_pwa_dismissed', 'true');
  };

  if (isInstalled) return null;

  return (
    <>
      {/* Floating Install Prompt Banner */}
      {isInstallable && !dismissed && (
        <div className={styles.bannerContainer}>
          <img 
            src="/icons/icon-192.png" 
            alt="FinBilling App Icon" 
            className={styles.appIcon} 
          />
          <div className={styles.content}>
            <div className={styles.title}>
              <span>Install FinBilling App</span>
              <Sparkles size={14} color="#F4C542" />
            </div>
            <div className={styles.subtitle}>
              Fast standalone billing, offline receipts & instant access.
            </div>
          </div>
          <div className={styles.actions}>
            <button 
              className={styles.installBtn} 
              onClick={installApp}
              id="btn-pwa-install-banner"
            >
              <Download size={13} />
              <span>Install</span>
            </button>
            <button 
              className={styles.closeBtn} 
              onClick={handleDismiss}
              title="Dismiss"
              aria-label="Dismiss banner"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Instructional Modal (for iOS Safari or manual instruction) */}
      {showInstallModal && (
        <div className={styles.modalBackdrop} onClick={() => setShowInstallModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>
                <Smartphone size={20} color="#38BDF8" />
                <span>{isIOS ? 'Install on iPhone / iPad' : 'Install FinBilling Application'}</span>
              </div>
              <button 
                className={styles.closeBtn} 
                onClick={() => setShowInstallModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className={styles.modalBody}>
              {isIOS ? (
                <>
                  <p>To install FinBilling as an app on your Apple iOS device:</p>
                  <div className={styles.instructionStep}>
                    <div className={styles.stepNumber}>1</div>
                    <div className={styles.stepText}>
                      Tap the <span className={styles.stepIconBadge}><Share size={12} style={{ marginRight: 4 }} /> Share</span> button in Safari's bottom toolbar.
                    </div>
                  </div>
                  <div className={styles.instructionStep}>
                    <div className={styles.stepNumber}>2</div>
                    <div className={styles.stepText}>
                      Scroll down and tap <span className={styles.stepIconBadge}><PlusSquare size={12} style={{ marginRight: 4 }} /> Add to Home Screen</span>.
                    </div>
                  </div>
                  <div className={styles.instructionStep}>
                    <div className={styles.stepNumber}>3</div>
                    <div className={styles.stepText}>
                      Tap <strong>Add</strong> in the top-right corner. The FinBilling app will appear on your Home Screen!
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <p>
                    FinBilling can be installed as a native-feel desktop or mobile application on Windows, macOS, Android, and Linux.
                  </p>
                  <div className={styles.instructionStep}>
                    <div className={styles.stepNumber}>1</div>
                    <div className={styles.stepText}>
                      Look for the <strong>Install App</strong> button in your browser's address bar or click below.
                    </div>
                  </div>
                  <div className={styles.instructionStep}>
                    <div className={styles.stepNumber}>2</div>
                    <div className={styles.stepText}>
                      Confirm <strong>Install</strong> to get high-performance full-screen billing & thermal printing.
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className={styles.modalFooter}>
              {isInstallable && !isIOS ? (
                <button 
                  className={styles.installBtn}
                  onClick={() => {
                    setShowInstallModal(false);
                    installApp();
                  }}
                >
                  <Download size={14} />
                  <span>Install FinBilling Now</span>
                </button>
              ) : (
                <button 
                  className={styles.installBtn}
                  onClick={() => setShowInstallModal(false)}
                >
                  <CheckCircle2 size={14} />
                  <span>Got It</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
