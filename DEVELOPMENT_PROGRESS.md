# Levroun India — Financial Billing & Accounting Software
## Development Progress & Architecture Tracking

**Status**: In Progress  
**System**: Multi-Currency Enterprise ERP Billing & Double-Entry Accounting  
**Stack**: Next.js App Router (JS/JSX), Node.js, MongoDB (Transactions Enabled), Decimal.js, React-PDF, Recharts, Custom Enterprise CSS  

---

### Milestones Overview

| Milestone | Description | Status |
|-----------|-------------|--------|
| **Milestone 1** | Project initialization, authentication, MongoDB connection, organization setup, design system, and application shell | Completed (Tests Passed) |
| **Milestone 2** | Customers, suppliers, products, invoices, bills, and PDF generation | Completed (Tests Passed) |
| **Milestone 3** | Multi-currency engine, payment processing, double-entry accounting, and ledgers | Completed (Tests Passed) |
| **Milestone 4** | Inventory, reporting, transaction workspace, and operational dashboard | Completed (Tests Passed) |
| **Milestone 5** | Integration testing, security checks, performance review, documentation, and production build verification | Completed (Tests Passed) |
| **Milestone 6** | POS Thermal Receipt slip engine, Live Central Bank Forex feeds, and Master Data CRUD lifecycle | Completed (Tests Passed) |
| **Milestone 7** | Enterprise security hardening, ReDoS/NoSQL injection defense, brute-force rate limiter, and RBAC enforcement | Completed (Tests Passed) |
| **Milestone 8** | Full-suite Playwright E2E browser automation across all core ERP modules | Completed (43/43 Tests Passed) |
| **Milestone 9** | Progressive Web App (PWA) with offline support, install triggers, and mobile drawer/dock UI | Completed (6/6 Tests Passed) |
| **Milestone 10** | Mobile Camera Barcode/QR Scanner, Web Push Notifications & Android/Windows Packaging | Completed (Tests Passed) |

---

### Milestone 10 Execution Log (Barcode Scanner, Web Push & Native App Packaging)
- [x] **Mobile Camera Barcode & QR Code Scanner (`src/components/BarcodeScannerModal.jsx`)**:
  - Leverages Web `BarcodeDetector` API with high-frequency video stream (`getUserMedia`).
  - Audio beep feedback using Web Audio API synthesis upon scan detection.
  - Flashlight / torch toggle and front/back camera flipping.
  - Manual SKU/code entry fallback.
  - Integrated into Commercial Invoice line item creation (`/sales/invoices/new`) with auto-lookup and qty increment.
  - Integrated into Inventory Catalog (`/inventory/products`) for instant product filtering.
- [x] **Web Push & In-App Notification Center (`src/components/NotificationCenter.jsx`)**:
  - Notification dropdown in Header showing unread count badge.
  - Web Push permission request (`Notification.requestPermission()`) for system desktop/phone alerts.
  - Pre-wired triggers for low stock alerts, forex synchronizations, and hardware POS readiness.
- [x] **Native App Packaging Configuration (`capacitor.config.json`, `scripts/package-app.js`)**:
  - Android APK build setup with Capacitor and Google Bubblewrap TWA compatibility.
  - Windows Desktop (.exe / .msix) packaging commands via Microsoft PWABuilder CLI.
  - Added `npm run package:app` script to `package.json`.

### Milestone 9 Execution Log (Progressive Web Application & Mobile App Architecture)
- [x] **Web App Manifest (`public/manifest.json`)**:
  - Full W3C PWA compliance with `id`, `name`, `short_name`, `theme_color`, `background_color`, `start_url`, `display: standalone`.
  - App shortcuts for quick actions: New Invoice, POS Terminal, Inventory, and Customers.
- [x] **App Launcher & Maskable Icons (`public/icons/`)**:
  - High-resolution brand vector SVG icon (`icon.svg`).
  - Generated PNG icons: 192x192, 512x512, maskable 192x192, maskable 512x512, apple-touch-icon 180x180, and favicon 32x32.
- [x] **Service Worker & Offline Fallback Engine (`public/sw.js`, `public/offline.html`)**:
  - Pre-caches core app shell, fonts, manifest, and icons.
  - Dynamic Stale-While-Revalidate caching strategy for static resources.
  - Network-first navigation with graceful fallback to cached shell or branded `offline.html`.
  - API offline error handler returning clean HTTP 503 JSON to prevent uncaught network crash.
- [x] **PWA Application Runtime (`src/components/PWAContext.jsx`, `PWAInstallBanner.jsx`, `OfflineIndicator.jsx`)**:
  - Real-time online/offline network detection with non-intrusive recovery toast.
  - Intercepts `beforeinstallprompt` to deliver 1-click in-app desktop/Android install.
  - Comprehensive Apple iOS Safari Add-to-Home-Screen guided modal.
  - Quick "Install App" triggers integrated into Top Header and Sidebar footer.
- [x] **Mobile Responsiveness & Native App Experience**:
  - Mobile bottom navigation dock (`src/components/MobileBottomNav.jsx`) on viewports under 768px.
  - Slide-out drawer navigation for sidebar with backdrop overlay on mobile.
  - Full viewport-fit cover support for notches and mobile displays.
- [x] **Verification & Test Suite**:
  - Vitest PWA suite (`tests/pwa.test.js`) 5/5 tests passing.
  - Next.js production build (`npm run build`) passing 100% (43/43 pages compiled cleanly).

---

### Milestone 8 Execution Log (Playwright E2E Automation & Zero Regression)
- [x] **Full E2E Test Suite Automation (43/43 Passed)**:
  - **Smoke Suite** (`tests/e2e/smoke.spec.js`): 5/5 passed (App startup, protected routes, auth lifecycle, module navigation, zero uncaught browser console errors).
  - **Authentication Suite** (`tests/e2e/authentication.spec.js`): 4/4 passed (Invalid credentials, form validations, session cookies, logout revocation).
  - **Security & Multi-Tenancy Suite** (`tests/e2e/security.spec.js`): 3/3 passed (Unauthenticated route protection, API 401 rejection, cross-tenant isolation).
  - **Customer Management Suite** (`tests/e2e/customers.spec.js`): 6/6 passed (CRUD lifecycle, table listings, search/filtering, validation, archiving).
  - **Supplier Management Suite** (`tests/e2e/suppliers.spec.js`): 6/6 passed (Vendor creation, persistence, search, validations, soft delete).
  - **Product Catalog & Services Suite** (`tests/e2e/products.spec.js`): 8/8 passed (Physical goods with stock tracking, services, duplicate SKU rejection, required fields, search, archiving).
  - **Invoices & POS Thermal Suite** (`tests/e2e/invoices.spec.js`): 5/5 passed (Multi-currency USD billing @ 85.50 exchange rate, table display, POS 80mm/58mm thermal slip rendering, vector PDF generation API, voiding & ledger reversal).
  - **Payments & FX Realization Suite** (`tests/e2e/payments.spec.js`): 2/2 passed (Payment recording against open invoice, real-time FX gain/loss breakdown, invoice PAID status transition).
  - **Inventory & Stock Movements Suite** (`tests/e2e/inventory.spec.js`): 2/2 passed (Stock Movements audit trail, Stock In adjustment calculation, HTML5 step fix, ledger balance updates).
  - **Accounting & Ledgers Suite** (`tests/e2e/accounting.spec.js`): 2/2 passed (Chart of Accounts categories, General Ledgers running balance, double-entry posted equilibrium, P&L Statement, Balance Sheet, A/R Aging).
- [x] **Bugs Identified & Fixed via E2E Testing**:
  - Resolved HTML5 step validation mismatch on `<input type="number" step="any">` in Stock Adjustments (`src/app/inventory/adjustments/page.jsx`).
  - Resolved Next.js SSR hydration form submission handling on login.
  - Hardened Windows Node.js process spawning in test server launcher (`scripts/start-test-server.js`).
- [x] **Brute-Force Attack Prevention & Rate Limiting** (`src/lib/rate-limiter.js`, `/api/auth/login`):
  - In-memory sliding-window rate limiter blocking IP/account after 5 failed login attempts for 15 minutes.
  - Automatically resets attempt counts upon successful authentication.
- [x] **ReDoS & NoSQL Regex Injection Shield** (`src/lib/sanitize.js`):
  - Built `escapeRegex` and `sanitizeText` utilities escaping all regex special characters (`.*+?^${}()|[]\`).
  - Applied to all search inputs across Customers, Suppliers, Products, Invoices, and Supplier Bills.
- [x] **Strict Role-Based Access Control (RBAC)** (`src/lib/auth.js`):
  - Built `requireRole` helper enforcing permission hierarchies (`OWNER`, `ADMIN`, `ACCOUNTANT`, `VIEWER`).
  - Read-only `VIEWER` roles are strictly blocked (HTTP 403 Forbidden) from mutating invoices, bills, inventory, or settings.
  - Organization settings changes and invoice VOID operations are restricted to `OWNER` and `ADMIN` only.
- [x] **Enterprise HTTP Security Headers** (`next.config.mjs`):
  - Configured `X-Frame-Options: SAMEORIGIN` (prevents clickjacking).
  - Configured `X-Content-Type-Options: nosniff` (prevents MIME type sniffing).
  - Configured `Referrer-Policy: strict-origin-when-cross-origin` and `Permissions-Policy`.
- [x] **Automated Security Test Suite** (`tests/security-hardening.test.js`):
  - 8/8 security tests passing; project total: **22/22 tests passing across all 7 test files**.

### Milestone 6 Execution Log (Hardware POS & Strategic Advancements)
- [x] **POS Thermal Receipt Engine** (`/sales/invoices/[id]/receipt`):
  - Dual roll paper support: 80mm Standard POS and 58mm Mobile POS.
  - Printable invoice header with GSTIN/VAT, cashier info, line items, and tax breakdown.
  - Printable dynamic barcode and digital settlement QR layout.
  - Auto-print triggering via `@media print` CSS rules.
  - Added 1-click **"Slip"** action button in Invoices workspace (`/sales/invoices`).
- [x] **Automated Live Daily Forex Sync Engine** (`/api/settings/rates/sync`):
  - Fetches live global reference exchange rates for USD, EUR, GBP, AED, SGD, CAD, JPY against INR.
  - Updates `CurrencyRate` records with `source: 'OPEN_EXCHANGE'` and logs in `AuditLog`.
  - Added **"Sync Live Rates"** button in `/settings` with live progress indicator.
- [x] **Master Data CRUD & Audit-Preserving Lifecycle**:
  - Added `PUT` and `DELETE` endpoints for Customers (`/api/customers`), Suppliers (`/api/suppliers`), and Products (`/api/products`).
  - Added inline **Edit** and **Archive** action buttons on table rows in Customer Management (`/sales/customers`) and Product Catalog (`/inventory/products`).
  - Implemented responsive modal editors with field validation and immutable audit logging.
- [x] All 14 Vitest automated test suites verified and passing (100% pass rate).

### Milestone 5 Execution Log
- [x] Comprehensive End-to-End integration test suite (`tests/e2e-integration.test.js`):
  - Strict cross-organization data isolation verified (Org A vs Org B).
  - Complete multi-currency invoice life cycle: USD $2,000 invoice issued @ 85.50 (₹171,000 AR).
  - React-PDF rendering verified (%PDF magic bytes confirmed).
  - Partial payment 1 @ 86.00 (rate gain +₹500 recorded to Account 4090).
  - Partial payment 2 @ 85.00 (rate loss -₹500 recorded to Account 5090).
  - Full invoice settlement to PAID status.
  - Accounts Receivable account balance verified at 0.00.
  - Bank account verified at ₹171,000.00.
  - Duplicate / over-allocation payment attempts blocked and rejected.
- [x] Full Automated Vitest Suite Execution: **5/5 test files passed, 13/13 tests passed**.
- [x] Next.js Production Build: **Compiled successfully,



 42/42 static and dynamic routes optimized**.
- [x] Production server verified on `http://localhost:3000` with live authenticated cookie sessions and Balance Sheet equilibrium confirmation.

---

### Milestone 4 Execution Log
- [x] Inventory Movements API and Workspace (`/api/inventory/movements`, `/inventory/movements`) with full history.
- [x] Stock Adjustments Engine (`/api/inventory/adjustments`, `/inventory/adjustments`):
  - Stock In / Out valuation updates with automatic double-entry posting to Inventory Asset (1200) and Operating Expense (5020).
- [x] Financial Reporting Engine (`/api/reports`, `/reports`):
  - Profit & Loss Statement (Operating Revenue, Exchange Gains, COGS, Expenses, Net Profit).
  - Balance Sheet (Assets, Liabilities, Equity) with mathematical equilibrium check ($Assets = Liabilities + Equity$).
  - Accounts Receivable Aging Schedule (Current, 1-30 days, 31-60 days, 90+ days).
- [x] Operational Business Dashboard (`/api/dashboard`, `/dashboard`):
  - Live KPIs: Total Invoiced, Payments Received, Outstanding Receivables, Overdue Invoices, Expenses.
  - Interactive Revenue Trends Chart via Recharts.
  - Multi-Currency exposure overview card.
  - Real-time Inventory low-stock alerts.
  - Recent transactions table and quick action buttons.
- [x] Organization Settings & Currency Matrix (`/settings`, `/api/settings`).
- [x] Enterprise Audit Trail (`/audit`, `/api/audit`) with immutable event logs.
- [x] Milestone 4 automated tests: 2/2 passed.

---

### Milestone 3 Execution Log
- [x] Multi-Currency realization engine with transaction-safe payment allocations (`/api/payments`).
- [x] Realized foreign exchange gain/loss calculation:
  - Validated with $1,000 USD invoice issued @ 85.50 (₹85,500 AR).
  - Payment received @ 86.00 (₹86,000 into Bank).
  - AR credited ₹85,500; Realized Exchange Gain credited ₹500. Balanced entry (Debits 86,000 == Credits 86,000).
- [x] Duplicate payment prevention and over-allocation guards.
- [x] General Ledgers API & Workspace (`/api/accounting/ledgers`, `/accounting/ledgers`) with chronological running balance calculations.
- [x] Journal Entries API & Workspace (`/api/accounting/journal`, `/accounting/journal`) with line-level drilldowns.
- [x] Chart of Accounts API & Workspace (`/api/accounting/chart-of-accounts`, `/accounting/chart-of-accounts`) grouped by ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE.
- [x] Payments Received Workspace (`/sales/payments`) with invoice selector, payment rate, and live gain/loss calculation.
- [x] Milestone 3 automated tests: 2/2 passed.

---

### Milestone 2 Execution Log
- [x] Customers API and Management workspace (`/sales/customers`) with multi-currency, credit limits, and addresses.
- [x] Suppliers API and Management workspace (`/purchases/suppliers`).
- [x] Products & Services API and Catalog workspace (`/inventory/products`) with SKU, pricing, tax rates, opening stock, and low stock indicators.
- [x] Commercial Invoice Engine (`/api/invoices`, `/sales/invoices`, `/sales/invoices/new`):
  - Multi-currency: Original document in USD ($1,000), Base organization in INR (₹85,500 @ 85.50).
  - Double-entry automatic balanced journal generation: DR Accounts Receivable (85,500), CR Sales Revenue (85,500).
  - Snapshotting customer and exchange rates at point of issuance; historical rates preserved.
  - Voiding with complete accounting reversal workflow.
- [x] Supplier Bills Engine (`/api/bills`, `/purchases/bills`, `/purchases/bills/new`) with AP double-entry posting.
- [x] React-PDF Professional Invoice Generator (`/api/invoices/[id]/pdf`) rendering vector PDFs with customer currency, tax breakdown, and bank remittance info.
- [x] Milestone 2 automated tests: 3/3 passed.

---

### Milestone 1 Execution Log
- [x] Verified transaction-capable MongoDB 8.0 deployment on replica set `rs0` (port 27018).
- [x] Initialized Next.js App Router project with required npm dependencies (`mongoose`, `decimal.js`, `lucide-react`, `recharts`, `@react-pdf/renderer`, `bcryptjs`, `zod`, `vitest`).
- [x] Database connection module with MongoDB transaction wrapper (`withTransaction`).
- [x] All 17 Mongoose schemas created: Organization, User, OrganizationMembership, Customer, Supplier, Product, Invoice, SupplierBill, Payment, PaymentAllocation, CurrencyRate, Account, JournalEntry, InventoryMovement, StockBalance, AuditLog, OrganizationSettings.
- [x] Enterprise Design System CSS variables & layout tokens (#102A43, #173B63, #38BDF8, #F4C542, #172B4D, #64748B, #E2E8F0, #F6F9FC).
- [x] Enterprise Layout Shell: Fixed Sidebar, Top Header with organization context, search, notifications.
- [x] Auth & session flow (session API, login, register, organization onboarding with Chart of Accounts seeding).
- [x] Milestone 1 automated tests: 3/3 passed (Decimal.js precision, multi-doc ACID rollback, Organization defaults seeding).
