# Levroun ERP — Complete Beginner's Handbook & User Guide

Welcome to **Levroun ERP**! If you are new to billing and accounting software, this guide will walk you through everything step-by-step in plain English, with zero jargon.

---

## 1. What is this software, in simple terms?

Think of **Levroun ERP** as your company's digital financial brain:
1. **It tracks who owes you money** (Sales & Invoices).
2. **It tracks who you owe money to** (Purchases & Supplier Bills).
3. **It tracks what physical items or services you have in stock** (Inventory).
4. **It tracks all your money automatically** without you needing to know complex accounting math (Double-Entry Bookkeeping & Ledgers).
5. **It handles multiple currencies** (e.g. if an American client pays you in USD, while your local business runs in INR).

---

## 2. The 5-Step Daily Workflow

Running your business in this software follows a natural 5-step cycle:

```
[1. Products/Services] ──► [2. Customers/Suppliers] ──► [3. Sales Invoices]
                                                               │
                                                               ▼
[5. Reports & Profits] ◄── [Accounting & Ledgers] ◄── [4. Payments Received]
```

---

### Step 1: Add what you sell (Products & Services)
**Where to go:** Sidebar ➔ **Inventory** ➔ **Products & Services**

Before creating an invoice, tell the software what goods or services you sell.
- Click **`+ New Product / Service`**.
- **Type**:
  - Choose **Goods (Inventory)** if it is a physical item you store in a warehouse (e.g. "Dell Monitor", "Laptop"). You can enter how many you have in stock right now (e.g. 50 pcs).
  - Choose **Service** if you sell time/skills (e.g. "Consulting", "Software Development"). Services don't need inventory tracking.
- **SKU**: A unique code for your item (e.g. `PROD-001` or `SRV-WEB`).
- **Selling Price**: The price you charge your customer.
- **GST / Tax Rate**: Tax percentage (e.g. 18% standard GST, or 0% exempt).
- Click **Save Product**.

---

### Step 2: Add who you do business with (Customers & Suppliers)
**Where to go:** 
- For Clients who buy from you: Sidebar ➔ **Sales** ➔ **Customers**
- For Vendors you buy parts from: Sidebar ➔ **Purchases** ➔ **Suppliers**

- Click **`+ New Customer`**.
- Enter their **Legal Name** (e.g. "Acme Corp").
- Select their **Billing Currency**:
  - `INR` for local Indian clients.
  - `USD`, `EUR`, or `GBP` for international clients!
- Enter their Email and Tax ID / GSTIN if applicable.
- Click **Save Customer**.

---

### Step 3: Issue an Invoice when you make a sale
**Where to go:** Sidebar ➔ **Sales** ➔ **Invoices**

When a client buys goods or services, you issue an **Invoice**:
- Click **`+ New Invoice`**.
- Select the **Customer** you added in Step 2.
- Notice how the **Currency** automatically switches to the customer's currency (e.g. USD).
- **Add Items**: Select the product or service from your catalog, enter the quantity. The system automatically computes the totals and taxes.
- **Save as DRAFT** if you are still preparing it.
- **POST / FINALIZE** when you are ready to issue it to the client:
  - This automatically creates the accounting records.
  - If it's a physical product, it automatically deducts the quantity from your stock!
- Click **`Download / Print PDF`** to get a formatted, printable vector PDF invoice with your company branding, tax breakdown, and bank details.

---

### Step 4: Record when the customer pays you
**Where to go:** Sidebar ➔ **Sales** ➔ **Payments Received**

When the client transfers money to your bank account:
- Click **`+ Record Customer Payment`**.
- Select the Customer.
- The system will show all their unpaid invoices.
- Enter the **Amount Received** (e.g. `$1,000.00`).
- Select the **Payment Date** and payment method (Bank Transfer, UPI, Cheque, Cash).
- **Multi-Currency Magic (Exchange Gain/Loss)**:
  - If you billed them at 1 USD = ₹84.00, but on the day they paid the rate became 1 USD = ₹86.00:
  - The software automatically calculates the **₹2,000 Exchange Gain** and credits your Forex Gain account without you doing any manual calculations!
- Click **Save Payment**. The invoice status automatically changes to **PAID**.

---

### Step 5: Track your expenses & vendor bills
**Where to go:** Sidebar ➔ **Purchases** ➔ **Supplier Bills** or **Expenses**

- When you receive an electric bill, cloud hosting bill, or raw material bill from a vendor:
- Click **`+ Record Vendor Bill`**.
- This tracks your **Accounts Payable** (money you owe) so you never miss a payment deadline.

---

## 3. What happens behind the scenes? (Accounting Made Simple)

Traditional accounting requires debiting and crediting ledger accounts manually. In Levroun ERP, this happens **100% automatically**:

| Action you take | What the software does in the background |
| :--- | :--- |
| **You finalize an Invoice** | Debits **Accounts Receivable** (Client owes money)<br>Credits **Sales Revenue** (You earned income)<br>Credits **Taxes Payable** (GST collected) |
| **You record a Payment** | Debits **Bank Account** (Cash increases)<br>Credits **Accounts Receivable** (Client no longer owes money) |
| **You buy inventory goods** | Debits **Inventory Asset** (Stock increases)<br>Credits **Accounts Payable** (Vendor is owed money) |

You can inspect the complete audit trail anytime under **Accounting ➔ Ledgers** or **Accounting ➔ Journal Entries**.

---

## 4. How to check your business performance

### 1. The Dashboard (`/dashboard`)
Your control cockpit:
- **Total Invoiced**: Total billing issued.
- **Payments Received**: Cash actually collected in the bank.
- **Outstanding Receivables**: Money clients still owe you.
- **Overdue Invoices**: Any bills past their due date that need follow-up.
- **Currency Exposure**: Breakdown of how much you hold in USD, EUR, INR.

### 2. Financial Reports (`/reports`)
- **Profit & Loss (P&L)**: Shows your Revenue minus Expenses = **Net Profit**.
- **Balance Sheet**: Verifies the Golden Accounting Equation:  
  $$\text{Assets} = \text{Liabilities} + \text{Equity}$$
- **A/R Aging**: Shows overdue debts categorized by `0-30 Days`, `31-60 Days`, `61-90 Days`, and `90+ Days`.

---

## 5. Security & Multi-Tenancy

- Everything is protected by JWT sessions and role-based permissions.
- Each organization's financial records are isolated.
- Every major action (invoice issuance, payments, stock adjustments) is logged permanently under **Management ➔ Audit Trail**.
