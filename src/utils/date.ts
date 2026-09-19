import { format, parseISO, startOfDay } from 'date-fns';

export const BANGLADESH_TIMEZONE = 'Asia/Dhaka';
export const BANGLADESH_UTC_OFFSET_HOURS = 6;

/**
 * Returns today's calendar date string (YYYY-MM-DD) in Bangladesh Standard Time (BST, Asia/Dhaka)
 */
export const getBangladeshTodayString = (date: Date = new Date()): string => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: BANGLADESH_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
};

/**
 * Returns the current year (e.g. 2026) in Bangladesh Standard Time
 */
export const getBangladeshCurrentYear = (date: Date = new Date()): number => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: BANGLADESH_TIMEZONE,
    year: 'numeric',
  });
  return Number.parseInt(formatter.format(date), 10);
};

/**
 * Returns the current month (1-12) in Bangladesh Standard Time
 */
export const getBangladeshCurrentMonth = (date: Date = new Date()): number => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: BANGLADESH_TIMEZONE,
    month: 'numeric',
  });
  return Number.parseInt(formatter.format(date), 10);
};

/**
 * Converts any UTC Date object to a Date representing Bangladesh Standard Time wall-clock values
 */
export const toBangladeshTime = (date: Date = new Date()): Date => {
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  return new Date(utc + 3600000 * BANGLADESH_UTC_OFFSET_HOURS);
};

/**
 * Formats a date using date-fns format string according to Bangladesh Standard Time
 */
export const formatInBangladeshTime = (
  date: Date | string | number,
  formatPattern: string,
): string => {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  return format(toBangladeshTime(d), formatPattern);
};

/**
 * Normalizes a YYYY-MM-DD date string into a Date object representing UTC calendar day start
 */
export const normalizeDateToUtc = (dateStr: string): Date => {
  return startOfDay(parseISO(`${dateStr}T00:00:00.000Z`));
};

/**
 * Formats a Date object to YYYY-MM-DD string
 */
export const formatDateToCalendarString = (date: Date): string => {
  return format(date, 'yyyy-MM-dd');
};

/**
 * Returns the start of today in Bangladesh Standard Time as a UTC-aligned boundary Date (midnight BST)
 */
export const getBangladeshMidnightUtc = (date: Date = new Date()): Date => {
  const todayStr = getBangladeshTodayString(date);
  return new Date(`${todayStr}T00:00:00.000+06:00`);
};

/**
 * Returns the start of today in Bangladesh Standard Time as a UTC-aligned boundary Date
 */
export const getBangladeshTodayStartUtc = (date: Date = new Date()): Date => {
  const todayStr = getBangladeshTodayString(date);
  return normalizeDateToUtc(todayStr);
};
