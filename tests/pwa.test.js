import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Progressive Web App (PWA) Implementation Suite', () => {
  const rootDir = path.resolve(__dirname, '..');
  const publicDir = path.join(rootDir, 'public');
  const manifestPath = path.join(publicDir, 'manifest.json');
  const swPath = path.join(publicDir, 'sw.js');
  const offlinePath = path.join(publicDir, 'offline.html');

  it('verifies manifest.json exists, parses cleanly and conforms to W3C PWA standards', () => {
    expect(fs.existsSync(manifestPath)).toBe(true);
    const content = fs.readFileSync(manifestPath, 'utf8');
    const manifest = JSON.parse(content);

    expect(manifest.name).toContain('FinBilling');
    expect(manifest.short_name).toBe('FinBilling');
    expect(manifest.start_url).toBe('/dashboard');
    expect(manifest.display).toBe('standalone');
    expect(manifest.theme_color).toBe('#173B63');
    expect(manifest.background_color).toBe('#102A43');
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBeGreaterThanOrEqual(4);
    expect(Array.isArray(manifest.shortcuts)).toBe(true);
  });

  it('validates all declared launcher and maskable app icons exist on disk', () => {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    for (const icon of manifest.icons) {
      // icon.src is like /icons/icon-192.png
      const iconFilePath = path.join(publicDir, icon.src.replace(/^\//, ''));
      expect(fs.existsSync(iconFilePath)).toBe(true);
      const stat = fs.statSync(iconFilePath);
      expect(stat.size).toBeGreaterThan(100); // Valid graphic content
    }
  });

  it('verifies service worker sw.js is present with caching & offline fallback strategies', () => {
    expect(fs.existsSync(swPath)).toBe(true);
    const swContent = fs.readFileSync(swPath, 'utf8');

    expect(swContent).toContain("addEventListener('install'");
    expect(swContent).toContain("addEventListener('activate'");
    expect(swContent).toContain("addEventListener('fetch'");
    expect(swContent).toContain('/offline.html');
    expect(swContent).toContain('/manifest.json');
    expect(swContent).toContain('caches.open');
  });

  it('verifies offline.html exists and provides branded offline UI with auto-reload', () => {
    expect(fs.existsSync(offlinePath)).toBe(true);
    const offlineContent = fs.readFileSync(offlinePath, 'utf8');

    expect(offlineContent).toContain('No Internet Connection');
    expect(offlineContent).toContain('Retry Connection');
    expect(offlineContent).toContain("window.addEventListener('online'");
  });

  it('verifies PWA components and provider exist', () => {
    const pwaContextPath = path.join(rootDir, 'src', 'components', 'PWAContext.jsx');
    const pwaBannerPath = path.join(rootDir, 'src', 'components', 'PWAInstallBanner.jsx');
    const offlineIndicatorPath = path.join(rootDir, 'src', 'components', 'OfflineIndicator.jsx');
    const mobileBottomNavPath = path.join(rootDir, 'src', 'components', 'MobileBottomNav.jsx');

    expect(fs.existsSync(pwaContextPath)).toBe(true);
    expect(fs.existsSync(pwaBannerPath)).toBe(true);
    expect(fs.existsSync(offlineIndicatorPath)).toBe(true);
    expect(fs.existsSync(mobileBottomNavPath)).toBe(true);
    expect(fs.existsSync(path.join(rootDir, 'src', 'components', 'BarcodeScannerModal.jsx'))).toBe(true);
    expect(fs.existsSync(path.join(rootDir, 'src', 'components', 'NotificationCenter.jsx'))).toBe(true);
  });

  it('verifies capacitor.config.json is configured for Android APK and desktop exports', () => {
    const capPath = path.join(rootDir, 'capacitor.config.json');
    expect(fs.existsSync(capPath)).toBe(true);
    const cap = JSON.parse(fs.readFileSync(capPath, 'utf8'));
    expect(cap.appId).toBe('com.levroun.finbilling');
    expect(cap.appName).toContain('FinBilling');
  });
});
