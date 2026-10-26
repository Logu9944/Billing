import { JournalEntry, Account, OrganizationSettings } from '@/models';
import { toDecimal, toDecimal128, financial, round } from '@/lib/decimal';
import mongoose from 'mongoose';

/**
 * Validates double-entry balancing and posts a journal entry atomically.
 */
export async function postJournalEntry({
  organizationId,
  date = new Date(),
  referenceType = 'MANUAL',
  referenceId = null,
  referenceNumber = '',
  memo,
  currency = 'INR',
  lines = [],
  idempotencyKey = null,
  session
}) {
  if (!lines || lines.length < 2) {
    throw new Error('A journal entry must contain at least two lines');
  }

  // Idempotency check
  if (idempotencyKey) {
    const existing = await JournalEntry.findOne({ organizationId, idempotencyKey }).session(session);
    if (existing) {
      return existing; // Already posted idempotently
    }
  }

  // Calculate total debits and credits using Decimal.js
  let totalDebit = toDecimal(0);
  let totalCredit = toDecimal(0);

  const formattedLines = [];

  for (const line of lines) {
    const debit = toDecimal(line.debit || 0);
    const credit = toDecimal(line.credit || 0);

    if (debit.isNegative() || credit.isNegative()) {
      throw new Error('Debit and Credit amounts must be non-negative');
    }
    if (debit.isZero() && credit.isZero()) {
      continue;
    }
    if (!debit.isZero() && !credit.isZero()) {
      throw new Error('A single journal line cannot have both debit and credit amounts');
    }

    totalDebit = financial.add(totalDebit, debit);
    totalCredit = financial.add(totalCredit, credit);

    // Fetch account details
    const account = await Account.findById(line.accountId).session(session);
    if (!account) {
      throw new Error(`Account not found: ${line.accountId}`);
    }

    formattedLines.push({
      accountId: account._id,
      accountCode: account.code,
      accountName: account.name,
      description: line.description || memo,
      debit: toDecimal128(debit),
      credit: toDecimal128(credit),
      foreignCurrency: line.foreignCurrency || null,
      foreignDebit: line.foreignDebit ? toDecimal128(line.foreignDebit) : null,
      foreignCredit: line.foreignCredit ? toDecimal128(line.foreignCredit) : null,
      exchangeRate: line.exchangeRate ? toDecimal128(line.exchangeRate) : null,
      _accountType: account.type // internal helper for balance update
    });
  }

  // Validate double-entry equilibrium: Debits == Credits (rounded to 2 decimal places)
  const diff = financial.sub(totalDebit, totalCredit).abs();
  if (diff.gt(0.01)) {
    throw new Error(`Unbalanced Journal Entry: Total Debits (${totalDebit.toFixed(2)}) must equal Total Credits (${totalCredit.toFixed(2)}). Difference: ${diff.toFixed(2)}`);
  }

  // Generate sequence entry number
  const settings = await OrganizationSettings.findOneAndUpdate(
    { organizationId },
    { $inc: { nextJournalNumber: 1 } },
    { new: true, upsert: true, session }
  );

  const entryNumber = `${settings.journalPrefix || 'JE-'}${settings.nextJournalNumber - 1}`;

  // Create Journal Entry document
  const [entry] = await JournalEntry.create([{
    organizationId,
    entryNumber,
    date,
    referenceType,
    referenceId,
    referenceNumber,
    memo,
    status: 'POSTED',
    currency,
    totalDebit: toDecimal128(totalDebit),
    totalCredit: toDecimal128(totalCredit),
    lines: formattedLines.map(({ _accountType, ...rest }) => rest),
    idempotencyKey
  }], { session });

  // Update Account Balances
  for (const line of formattedLines) {
    const debit = toDecimal(line.debit);
    const credit = toDecimal(line.credit);
    const isDebitNormal = line._accountType === 'ASSET' || line._accountType === 'EXPENSE';

    // For Asset/Expense: Net Change = Debit - Credit
    // For Liability/Equity/Revenue: Net Change = Credit - Debit
    const netChange = isDebitNormal ? financial.sub(debit, credit) : financial.sub(credit, debit);

    const acc = await Account.findById(line.accountId).session(session);
    const newBalance = financial.add(toDecimal(acc.currentBalance), netChange);

    acc.currentBalance = toDecimal128(newBalance);
    await acc.save({ session });
  }

  return entry;
}

/**
 * Reverses a posted journal entry with a complete counter-entry.
 */
export async function reverseJournalEntry({
  organizationId,
  journalEntryId,
  reason = 'Reversal of financial transaction',
  session
}) {
  const original = await JournalEntry.findOne({ _id: journalEntryId, organizationId }).session(session);
  if (!original) {
    throw new Error('Original journal entry not found');
  }
  if (original.status !== 'POSTED') {
    throw new Error(`Cannot reverse entry with status ${original.status}`);
  }

  // Reverse all lines: original debit becomes credit, credit becomes debit
  const reversalLines = original.lines.map(line => ({
    accountId: line.accountId,
    description: `Reversal: ${line.description}`,
    debit: toDecimal(line.credit).toString(),
    credit: toDecimal(line.debit).toString(),
    foreignCurrency: line.foreignCurrency,
    foreignDebit: line.foreignCredit ? toDecimal(line.foreignCredit).toString() : null,
    foreignCredit: line.foreignDebit ? toDecimal(line.foreignDebit).toString() : null,
    exchangeRate: line.exchangeRate ? toDecimal(line.exchangeRate).toString() : null
  }));

  const reversal = await postJournalEntry({
    organizationId,
    date: new Date(),
    referenceType: 'REVERSAL',
    referenceId: original._id,
    referenceNumber: original.entryNumber,
    memo: `[REVERSAL] ${reason} (Ref: ${original.entryNumber})`,
    currency: original.currency,
    lines: reversalLines,
    idempotencyKey: `REVERSAL_${original._id}`,
    session
  });

  // Link original and reversal
  original.status = 'REVERSED';
  original.reversedBy = reversal._id;
  await original.save({ session });

  reversal.reversalOf = original._id;
  await reversal.save({ session });

  return reversal;
}

/**
 * Finds or retrieves standard accounts for an organization.
 */
export async function getStandardAccounts(organizationId, session) {
  const accounts = await Account.find({ organizationId }).session(session);
  const map = {};
  for (const acc of accounts) {
    map[acc.code] = acc;
    map[acc.subType] = acc;
  }
  return map;
}
