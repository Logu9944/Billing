# Levroun ERP — Commercial Multi-Currency Billing & Double-Entry Accounting Platform

Built for **Levroun India Private Limited**  
**Version**: 1.0.0 Production  
**Stack**: Next.js App Router (JavaScript/JSX), Node.js, MongoDB (Transactions Enabled), Mongoose, Decimal.js, React-PDF, Recharts, Custom Enterprise CSS  

---

## 1. Architectural Highlights

- **Multi-Document ACID Transactions**: All multi-collection financial writes (invoices, bills, payments, inventory adjustments) are wrapped in genuine MongoDB replica set sessions (`withTransaction`). Never silently falls back to non-transactional writes.
- **Strict Decimal Precision**: Powered by `Decimal.js` (28 digits precision, standard `ROUND_HALF_UP`) and Mongoose `Decimal128` storage. Eliminates floating-point calculation errors.
- **Double-Entry Accounting Engine**:
  - Balanced postings enforced for every financial event ($Total\ Debits = Total\ Credits$).
  - Standard chart of accounts: Cash (1010), Bank (1020), Accounts Receivable (1100), Inventory Asset (1200), Accounts Payable (2010), Tax/GST (2020), Sales Revenue (4010), Exchange Gain (4090), COGS (5010), Operating Expenses (5020), Exchange Loss (5090).
  - Chronological general ledgers with running balance calculation.
- **Multi-Currency Realization Engine**:
  - Base currency: INR (Indian Rupee).
  - Documents support any billing currency (USD, EUR, GBP, etc.).
  - Preserves immutable historical exchange rates on invoices.
  - Payment-date conversion rates compute realized Foreign Exchange Gains (4090) or Losses (5090) automatically upon partial or full settlements.
- **Vector PDF Invoice Generation**:
  - Built with `@react-pdf/renderer`.
  - Customer-facing primary currency, tax breakdown, remittance instructions, bank details, and conversion notice.
- **Enterprise Design System**:
  - Bespoke CSS system adhering strictly to color specifications:
    - Dark navy (`#102A43`), Deep blue (`#173B63`), Sky blue (`#38BDF8`), Yellow accent (`#F4C542`), Off-white (`#F6F9FC`), White (`#FFFFFF`), Primary text (`#172B4D`), Secondary text (`#64748B`), Borders (`#E2E8F0`).
  - Inter typography, 4px scale, compact input radiuses (5px), and dense table views.

---

## 2. Directory Structure

```
├── DEVELOPMENT_PROGRESS.md       # Persistent milestone execution tracking
├── package.json
├── jsconfig.json
├── next.config.mjs
├── vitest.config.js
├── src/
│   ├── app/
│   │   ├── globals.css           # Enterprise design system styles & tokens
│   │   ├── layout.jsx            # Root HTML layout with Inter font
│   │   ├── page.jsx              # Root redirector
│   │   ├── login/page.jsx        # Enterprise login & onboarding
│   │   ├── dashboard/page.jsx    # Control center with Recharts & live KPIs
│   │   ├── sales/
│   │   │   ├── invoices/page.jsx # Invoices list & PDF export
│   │   │   ├── invoices/new/     # Multi-currency invoice creator
│   │   │   ├── customers/page.jsx# Customer CRM & credit limits
│   │   │   └── payments/page.jsx # Payments received & FX gain/loss preview
│   │   ├── purchases/
│   │   │   ├── bills/page.jsx    # Supplier bills & AP tracking
│   │   │   ├── bills/new/        # Record vendor bill
│   │   │   ├── suppliers/page.jsx# Supplier management
│   │   │   └── expenses/page.jsx # Corporate operating costs
│   │   ├── inventory/
│   │   │   ├── products/page.jsx # Product catalog & stock levels
│   │   │   ├── movements/page.jsx# Stock movements history
│   │   │   └── adjustments/page.jsx # Inventory reconciliation & asset valuation
│   │   ├── accounting/
│   │   │   ├── ledgers/page.jsx  # General Ledger per account with running balance
│   │   │   ├── journal/page.jsx  # Double-entry general journal entries
│   │   │   └── chart-of-accounts/page.jsx # Standardized accounts overview
│   │   ├── reports/page.jsx      # P&L, Balance Sheet, A/R Aging schedule
│   │   ├── settings/page.jsx     # Organization settings & currency matrix
│   │   ├── audit/page.jsx        # Immutable audit trail
│   │   └── api/                  # 14 Clean RESTful Backend API Endpoints
│   ├── components/
│   │   ├── AppLayout.jsx         # Sidebar + Header wrapper layout
│   │   ├── Sidebar.jsx           # Enterprise fixed navigation
│   │   └── Header.jsx            # Top bar with organization context & search
│   ├── lib/
│   │   ├── db.js                 # MongoDB connection & withTransaction ACID wrapper
│   │   ├── auth.js               # JWT edge session management & cookie helpers
│   │   ├── decimal.js            # Decimal.js calculations & Decimal128 conversions
│   │   ├── accounting-engine.js  # Double-entry posting & reversal engine
│   │   ├── org-init.js           # Standard Chart of Accounts auto-seeding
│   │   └── pdf/invoice-template.jsx # React-PDF template
│   ├── models/                   # All 17 Mongoose Models
│   │   ├── Organization.js
│   │   ├── User.js
│   │   ├── OrganizationMembership.js
│   │   ├── Customer.js
│   │   ├── Supplier.js
│   │   ├── Product.js
│   │   ├── Invoice.js
│   │   ├── SupplierBill.js
│   │   ├── Payment.js
│   │   ├── PaymentAllocation.js
│   │   ├── CurrencyRate.js
│   │   ├── Account.js
│   │   ├── JournalEntry.js
│   │   ├── InventoryMovement.js
│   │   ├── StockBalance.js
│   │   ├── AuditLog.js
│   │   └── OrganizationSettings.js
└── tests/                        # Automated Vitest test suites (13/13 passed)
    ├── milestone1.test.js
    ├── milestone2.test.js
    ├── milestone3.test.js
    ├── milestone4.test.js
    ├── e2e-integration.test.js
    └── seed.test.js
```

---

## 3. Getting Started & Setup

### Prerequisites
- Node.js >= 18 (Tested on v24.19.0)
- MongoDB running with replica set enabled (required for ACID transactions)

### Environment Variables
Configure `.env`:
```env
MONGODB_URI=mongodb://127.0.0.1:27018/fin_billing?replicaSet=rs0&directConnection=true
NEXTAUTH_SECRET=levroun_fin_billing_super_secret_jwt_key_99881122
NEXTAUTH_URL=http://localhost:3000
NODE_ENV=production
```

### Running Locally
```bash
# 1. Install dependencies
npm install --legacy-peer-deps

# 2. Run automated tests (all 5 suites)
npm test

# 3. Build optimized production bundle
npm run build

# 4. Start production server
npm start
```
Server will be accessible at: `http://localhost:3000`

---

## 4. Default Seeded Credentials

| User | Email | Password | Role | Organization |
|------|-------|----------|------|--------------|
| Adhurva (Principal Architect) | `adhurva@levroun.com` | `Password123!` | OWNER | Levroun India Private Limited |

---

## 5. Verification & Test Outcomes

| Test Suite | Tests | Result | Features Verified |
|------------|-------|--------|-------------------|
| `milestone1.test.js` | 3 | PASSED | Decimal.js precision, multi-doc ACID rollback, Chart of Accounts generation |
| `milestone2.test.js` | 3 | PASSED | USD customer creation, $1000 USD invoice with 85.50 rate, vector PDF buffer rendering |
| `milestone3.test.js` | 2 | PASSED | $1000 USD payment @ 86.00 rate with +₹500 realized exchange gain, over-allocation block |
| `milestone4.test.js` | 2 | PASSED | Stock adjustment valuation change, Balance Sheet accounting equilibrium ($Assets = Liab + Equity$) |
| `e2e-integration.test.js` | 3 | PASSED | Strict cross-org data isolation, partial payment cycle, full settlement to 0 balance |
| `seed.test.js` | 1 | PASSED | Levroun commercial demonstration seed verification |
| **Total Automated Tests** | **14** | **14/14 PASSED** | **100% test pass rate** |
| **Production Build** | **42 routes** | **COMPILED (0 errors)** | **All pages and API routes optimized** |

---

## 6. Known Limitations & Extensibility

1. **Exchange Rate Feeds**: The platform currently utilizes a configurable rate provider architecture set to `MANUAL` with fallback rates. RBI and ECB API connectors can be activated via provider flags in `OrganizationSettings`.
2. **Multi-Currency Bank Accounts**: The standard setup assumes bank accounts in base currency (INR) and foreign currency customer receipts. Multi-currency foreign exchange bank accounts can be added by assigning specific currency codes to individual Account records.
#   B i l l i n g -  
 