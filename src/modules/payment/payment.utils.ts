import crypto from 'node:crypto';
import { getYear } from 'date-fns';

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export const getMonthName = (month: number): string => {
  if (month < 1 || month > 12) {
    return 'Unknown';
  }
  return MONTH_NAMES[month - 1] || 'Unknown';
};

export const formatBillingPeriod = (month: number, year: number): string => {
  return `${getMonthName(month)} ${year}`;
};

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

export interface IUnpaidMonthCalculation {
  unpaidMonths: Array<{
    month: number;
    year: number;
    monthName: string;
    billingPeriod: string;
  }>;
  unpaidPeriodStrings: string[];
}

/**
 * Calculates unpaid months given a start billing period and set of paid periods
 */
export const calculateUnpaidPeriods = (
  startMonth: number,
  startYear: number,
  paidKeySet: Set<string>,
  targetDate = new Date(),
): IUnpaidMonthCalculation => {
  const currentYear = targetDate.getFullYear();
  const currentMonth = targetDate.getMonth() + 1;

  const unpaidMonths: Array<{
    month: number;
    year: number;
    monthName: string;
    billingPeriod: string;
  }> = [];
  const unpaidPeriodStrings: string[] = [];

  let iterYear = startYear;
  let iterMonth = startMonth;

  while (iterYear < currentYear || (iterYear === currentYear && iterMonth <= currentMonth)) {
    const key = `${iterYear}-${String(iterMonth).padStart(2, '0')}`;
    if (!paidKeySet.has(key)) {
      const billingPeriod = formatBillingPeriod(iterMonth, iterYear);
      unpaidMonths.push({
        month: iterMonth,
        year: iterYear,
        monthName: MONTH_NAMES[iterMonth - 1] || 'Month',
        billingPeriod,
      });
      unpaidPeriodStrings.push(billingPeriod);
    }

    iterMonth += 1;
    if (iterMonth > 12) {
      iterMonth = 1;
      iterYear += 1;
    }
  }

  return { unpaidMonths, unpaidPeriodStrings };
};
