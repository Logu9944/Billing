import Decimal from 'decimal.js';
import mongoose from 'mongoose';

// Configure Decimal.js for enterprise financial standards: 28 digits precision, Banker's or Standard Half-Up rounding
Decimal.set({
  precision: 28,
  rounding: Decimal.ROUND_HALF_UP,
  toExpNeg: -9,
  toExpPos: 28
});

export { Decimal };

/**
 * Creates a Decimal instance from number, string, or Decimal128
 */
export function toDecimal(val) {
  if (val === null || val === undefined || val === '') {
    return new Decimal(0);
  }
  if (val instanceof Decimal) {
    return val;
  }
  if (val instanceof mongoose.Types.Decimal128) {
    return new Decimal(val.toString());
  }
  if (typeof val === 'object' && val.$numberDecimal) {
    return new Decimal(val.$numberDecimal);
  }
  return new Decimal(val);
}

/**
 * Convert to Mongoose Decimal128 for storage
 */
export function toDecimal128(val) {
  const dec = toDecimal(val);
  return mongoose.Types.Decimal128.fromString(dec.toFixed(4));
}

/**
 * Convert Mongoose Decimal128 or string/number to fixed number for UI/JSON
 */
export function toFixedNumber(val, decimals = 2) {
  return parseFloat(toDecimal(val).toFixed(decimals));
}

/**
 * Convert to fixed string
 */
export function toFixedString(val, decimals = 2) {
  return toDecimal(val).toFixed(decimals);
}

/**
 * Standard rounding to specific decimal places
 */
export function round(val, decimals = 2) {
  return toDecimal(val).toDecimalPlaces(decimals, Decimal.ROUND_HALF_UP);
}

/**
 * Safe financial calculations
 */
export const financial = {
  add: (a, b) => toDecimal(a).plus(toDecimal(b)),
  sub: (a, b) => toDecimal(a).minus(toDecimal(b)),
  mul: (a, b) => toDecimal(a).times(toDecimal(b)),
  div: (a, b) => {
    const divisor = toDecimal(b);
    if (divisor.isZero()) {
      throw new Error('Division by zero in financial calculation');
    }
    return toDecimal(a).dividedBy(divisor);
  },
  eq: (a, b) => toDecimal(a).equals(toDecimal(b)),
  gte: (a, b) => toDecimal(a).greaterThanOrEqualTo(toDecimal(b)),
  gt: (a, b) => toDecimal(a).greaterThan(toDecimal(b)),
  lte: (a, b) => toDecimal(a).lessThanOrEqualTo(toDecimal(b)),
  lt: (a, b) => toDecimal(a).lessThan(toDecimal(b)),
  isZero: (a) => toDecimal(a).isZero(),
  isPositive: (a) => toDecimal(a).isPositive() && !toDecimal(a).isZero(),
  isNegative: (a) => toDecimal(a).isNegative()
};

/**
 * Format currency amount with symbol and locale
 */
export function formatCurrency(amount, currency = 'INR', decimals = 2) {
  const dec = toDecimal(amount);
  const num = parseFloat(dec.toFixed(decimals));
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency || 'INR',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(num);
  } catch (err) {
    return `${currency} ${dec.toFixed(decimals)}`;
  }
}
