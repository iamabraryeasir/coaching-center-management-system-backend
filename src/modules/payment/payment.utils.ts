import crypto from 'node:crypto';
import { getYear } from 'date-fns';

/**
 * Generates a unique human-readable receipt number (e.g. "REC-2026-A8B9C1")
 */
export const generateReceiptNumber = (): string => {
  const currentYear = getYear(new Date());
  const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
  const timestampSuffix = Date.now().toString().slice(-4);
  return `REC-${currentYear}-${randomHex}${timestampSuffix}`;
};

/**
 * Formats monetary amounts with currency code
 */
export const formatAmount = (amount: number, currency = 'BDT'): string => {
  return `${currency.toUpperCase()} ${amount.toFixed(2)}`;
};
