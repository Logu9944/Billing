/**
 * Levroun FinBilling — App Packaging & Export Utility
 * 
 * This script provides automated commands and checks to package FinBilling into:
 * 1. Android APK / Google Play bundle (via Google Bubblewrap TWA or Capacitor)
 * 2. Windows 11/10 Desktop Installer (.msix / .exe) (via Microsoft PWABuilder CLI)
 * 3. iOS Package (via Capacitor or PWA standalone)
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const manifestPath = path.join(rootDir, 'public', 'manifest.json');
const iconsDir = path.join(rootDir, 'public', 'icons');

console.log('='.repeat(70));
console.log('    LEVROUN FINBILLING — NATIVE APP PACKAGING ENGINE');
console.log('='.repeat(70));

// Step 1: Validate PWA assets
console.log('\n[1/3] Validating PWA Assets & Compliance:');
if (fs.existsSync(manifestPath)) {
  console.log('  ✓ Web App Manifest (public/manifest.json) found.');
} else {
  console.error('  ✗ Missing public/manifest.json');
}

const requiredIcons = ['icon-192.png', 'icon-512.png', 'icon-maskable-192.png', 'icon-maskable-512.png'];
let allIcons = true;
for (const icon of requiredIcons) {
  if (fs.existsSync(path.join(iconsDir, icon))) {
    console.log(`  ✓ Launcher Icon: ${icon}`);
  } else {
    console.error(`  ✗ Missing Icon: ${icon}`);
    allIcons = false;
  }
}

// Step 2: Android Packaging Instructions
console.log('\n[2/3] How to Build Native Android APK:');
console.log('  Option A: Using Google Official Bubblewrap CLI (Recommended, No Java required):');
console.log('    1. Install Bubblewrap:');
console.log('       npm install -g @bubblewrap/cli');
console.log('    2. Initialize Android Project:');
console.log('       bubblewrap init --manifest=http://localhost:3000/manifest.json');
console.log('    3. Build Signed APK / AAB:');
console.log('       bubblewrap build');
console.log('    -> Output: app-release-signed.apk ready to install on any Android phone!');
console.log('\n  Option B: Using Microsoft PWABuilder (Online Zero-Setup):');
console.log('    1. Deploy your FinBilling URL or use ngrok / cloudflare tunnel.');
console.log('    2. Visit https://www.pwabuilder.com and input your URL.');
console.log('    3. Click "Package for Android" -> Download finished .apk bundle.');

// Step 3: Windows Desktop (.exe / .msix) Instructions
console.log('\n[3/3] How to Build Windows 11/10 Desktop App:');
console.log('  1. Visit https://www.pwabuilder.com (or run PWABuilder CLI: npx @pwabuilder/cli)');
console.log('  2. Click "Package for Windows"');
console.log('  3. It generates a native Windows app with offline launch, full-screen billing,');
console.log('     and direct integration with Windows USB thermal receipt printers!');
console.log('='.repeat(70));
