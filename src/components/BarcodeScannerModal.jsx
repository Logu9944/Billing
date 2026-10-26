'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  X, 
  Flashlight, 
  SwitchCamera, 
  Barcode, 
  QrCode, 
  Check, 
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import styles from './BarcodeScannerModal.module.css';

export default function BarcodeScannerModal({ isOpen, onClose, onScan, title = 'Scan Product Barcode / QR' }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const animFrameRef = useRef(null);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' or 'user'
  const [manualCode, setManualCode] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [scannedCode, setScannedCode] = useState(null);

  // Audio Beep Feedback via Web Audio API
  const playBeep = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(987.77, ctx.currentTime); // B5 note
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {
      // AudioContext muted/unsupported
    }
  };

  const handleDetected = (code) => {
    if (!code || scannedCode) return;
    setScannedCode(code);
    playBeep();
    if (onScan) onScan(code);
    setTimeout(() => {
      if (onClose) onClose();
    }, 400);
  };

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  const startCamera = async () => {
    setErrorMessage('');
    setScannedCode(null);

    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMessage('Camera access is not supported by this browser environment. You can enter the SKU barcode manually below.');
      return;
    }

    try {
      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        // Check torch capability
        const track = stream.getVideoTracks()[0];
        if (track && track.getCapabilities && track.getCapabilities().torch) {
          setHasTorch(true);
        } else {
          setHasTorch(false);
        }

        // Start Barcode detection loop
        startDetectionLoop();
      }
    } catch (err) {
      console.warn('Camera stream error:', err);
      setErrorMessage('Could not access camera (' + (err.name || 'Permission denied') + '). Enter barcode manually below.');
    }
  };

  const stopCamera = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setTorchOn(false);
  };

  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track && hasTorch) {
      try {
        const nextTorch = !torchOn;
        await track.applyConstraints({ advanced: [{ torch: nextTorch }] });
        setTorchOn(nextTorch);
      } catch (e) {
        console.error('Torch error:', e);
      }
    }
  };

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const startDetectionLoop = () => {
    if (typeof window === 'undefined') return;

    if ('BarcodeDetector' in window) {
      try {
        const detector = new window.BarcodeDetector({
          formats: ['qr_code', 'ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e']
        });

        const detectFrame = async () => {
          if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
            try {
              const barcodes = await detector.detect(videoRef.current);
              if (barcodes.length > 0) {
                const rawValue = barcodes[0].rawValue;
                handleDetected(rawValue);
                return;
              }
            } catch (e) {
              // Frame drop
            }
          }
          animFrameRef.current = requestAnimationFrame(detectFrame);
        };

        animFrameRef.current = requestAnimationFrame(detectFrame);
      } catch (e) {
        console.warn('BarcodeDetector initialization failed, using manual fallback');
      }
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualCode.trim()) {
      handleDetected(manualCode.trim());
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.titleArea}>
            <Barcode size={22} color="#38BDF8" />
            <div>
              <div className={styles.title}>{title}</div>
              <div className={styles.subtitle}>Align barcode or QR code within the frame</div>
            </div>
          </div>
          <button 
            type="button" 
            className={styles.closeBtn} 
            onClick={onClose}
            aria-label="Close scanner"
          >
            <X size={18} />
          </button>
        </div>

        <div className={styles.viewportContainer}>
          {errorMessage ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#CBD5E1' }}>
              <AlertCircle size={36} color="#F4C542" style={{ margin: '0 auto 12px' }} />
              <p style={{ fontSize: 13, lineHeight: 1.5 }}>{errorMessage}</p>
            </div>
          ) : (
            <>
              <video 
                ref={videoRef} 
                playsInline 
                muted 
                className={styles.videoElement} 
              />
              <div className={styles.scanTargetOverlay}>
                <div className={styles.laserLine}></div>
                <div className={styles.targetCornerTL}></div>
                <div className={styles.targetCornerTR}></div>
                <div className={styles.targetCornerBL}></div>
                <div className={styles.targetCornerBR}></div>
              </div>

              <div className={styles.scanControlsBar}>
                {hasTorch && (
                  <button 
                    type="button" 
                    className={`${styles.controlBtn} ${torchOn ? styles.controlBtnActive : ''}`}
                    onClick={toggleTorch}
                  >
                    <Flashlight size={14} />
                    <span>{torchOn ? 'Torch On' : 'Torch'}</span>
                  </button>
                )}

                <button 
                  type="button" 
                  className={styles.controlBtn}
                  onClick={toggleFacingMode}
                >
                  <SwitchCamera size={14} />
                  <span>Flip Camera</span>
                </button>
              </div>
            </>
          )}
        </div>

        <div className={styles.footerBar}>
          <form onSubmit={handleManualSubmit} className={styles.manualInputForm}>
            <input 
              type="text" 
              className={styles.manualInput} 
              placeholder="Or enter SKU / Barcode manually..." 
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              id="input-barcode-manual"
            />
            <button 
              type="submit" 
              className={styles.manualSubmitBtn}
              id="btn-barcode-submit"
            >
              <span>Apply</span>
              <ArrowRight size={14} />
            </button>
          </form>
          <div className={styles.helperText}>
            Supports UPC, EAN-13, Code-128, QR Codes & Physical SKU numbers
          </div>
        </div>
      </div>
    </div>
  );
}
