/**
 * Core interfaces and types for the Dynamic Prisma QueryBuilder
 */

export type SortOrder = 'asc' | 'desc';

export interface IPaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface IFilterOptions {
  /** Fields to exclude from dynamic where filter (e.g. custom processed keys) */
  exclude?: string[];
  /** Exact match fields that should bypass partial matching */
  exactMatchFields?: string[];
}

export interface IPrismaQueryParams {
  where: Record<string, unknown>;
  orderBy: Record<string, unknown> | Array<Record<string, unknown>>;
  skip: number;
  take: number;
}

const RESERVED_QUERY_KEYS = new Set([
  'searchTerm',
  'search',
  'page',
  'limit',
  'sortBy',
  'sortOrder',
  'sort',
  'order',
  'fields',
  'include',
]);

/**
 * Parses and casts primitive query string values into native types (boolean, number, null, in array)
 */
export const parseFilterValue = (val: unknown): unknown => {
  if (typeof val !== 'string') {
    return val;
  }

  const trimmed = val.trim();
  const lower = trimmed.toLowerCase();

  // Boolean & Null casting
  if (lower === 'true') {
    return true;
  }
  if (lower === 'false') {
    return false;
  }
  if (lower === 'null') {
    return null;
  }

  // Comma-separated array list (e.g. status=ACTIVE,PENDING_ACTIVATION)
  if (trimmed.includes(',')) {
    const list = trimmed
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    return { in: list };
  }

  // Numeric casting for clean integer or float strings (avoiding phone numbers with leading '+' or zeros)
  if (/^-?\d+(\.\d+)?$/.test(trimmed) && !trimmed.startsWith('0') && trimmed.length < 10) {
    const num = Number(trimmed);
    if (!Number.isNaN(num)) {
      return num;
    }
  }

  return trimmed;
};

/**
 * Recursively creates a nested object for dot-notation paths (e.g. 'user.profile.name')
 */
export const buildNestedPathObject = (path: string, value: unknown): Record<string, unknown> => {
  const parts = path.split('.');
  if (parts.length === 1) {
    const key = parts[0] as string;
    return { [key]: value };
  }

  const result: Record<string, unknown> = {};
  let current = result;

  for (let i = 0; i < parts.length - 1; i++) {
    const segment = parts[i] as string;
    current[segment] = {};
    current = current[segment] as Record<string, unknown>;
  }

  const lastKey = parts[parts.length - 1] as string;
  current[lastKey] = value;
  return result;
};

/**
 * Constructs a Postgres case-insensitive string search condition for a field path
 */
const buildSearchCondition = (field: string, term: string): Record<string, unknown> => {
  const condition = {
    contains: term,
    mode: 'insensitive',
  };
  return buildNestedPathObject(field, condition);
};

/**
 * Builds a range filter object if key matches _gte, _lte, _gt, _lt or min/max prefixes
 */
const parseRangeFilter = (
  key: string,
  value: unknown,
): { targetKey: string; condition: Record<string, unknown> } | null => {
  const rangeSuffixes = ['_gte', '_lte', '_gt', '_lt'] as const;
  for (const suffix of rangeSuffixes) {
    if (key.endsWith(suffix)) {
      const targetKey = key.slice(0, -suffix.length);
      const operator = suffix.replace('_', '');
      const parsedVal = parseFilterValue(value);
      return { targetKey, condition: { [operator]: parsedVal } };
    }
  }

  if (key.startsWith('min') && key.length > 3) {
    const targetKey = key.charAt(3).toLowerCase() + key.slice(4);
    return { targetKey, condition: { gte: parseFilterValue(value) } };
  }

  if (key.startsWith('max') && key.length > 3) {
    const targetKey = key.charAt(3).toLowerCase() + key.slice(4);
    return { targetKey, condition: { lte: parseFilterValue(value) } };
  }

  return null;
};

/**
 * Parses individual sort expression (e.g. 'user.name:asc', '-createdAt', '+name')
 */
const parseSortExpression = (
  expression: string,
  fallbackOrder: SortOrder,
): { field: string; order: SortOrder } | null => {
  const trimmed = expression.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.includes(':')) {
    const [fieldPart, orderPart] = trimmed.split(':');
    const field = fieldPart?.trim() || trimmed;
    const cleanOrder = orderPart?.trim().toLowerCase();
    const order: SortOrder =
      cleanOrder === 'asc' || cleanOrder === 'desc' ? cleanOrder : fallbackOrder;
    return { field, order };
  }

  if (trimmed.startsWith('-')) {
    return { field: trimmed.substring(1).trim(), order: 'desc' };
  }

  if (trimmed.startsWith('+')) {
    return { field: trimmed.substring(1).trim(), order: 'asc' };
  }

  return { field: trimmed, order: fallbackOrder };
};

/**
 * High-End Dynamic QueryBuilder for Prisma ORM
 * Simplifies multi-field search, dynamic filtering, multi-sorting, and pagination across all modules.
 */
export class QueryBuilder {
  private query: Record<string, unknown>;
  private whereClause: Record<string, unknown> = {};
  private orderByClause: Array<Record<string, unknown>> = [];
  private pageNumber = 1;
  private limitNumber = 10;
  private skipCount = 0;

  constructor(query: Record<string, unknown> = {}) {
    this.query = { ...query };
  }

  /**
   * Performs multi-field case-insensitive search using 'searchTerm' or 'search'
   * Supports root fields ('name') and nested relation paths ('user.email')
   */
  public search(searchableFields: string[]): this {
    const searchTerm = (this.query.searchTerm || this.query.search) as string | undefined;

    if (
      searchTerm &&
      typeof searchTerm === 'string' &&
      searchTerm.trim().length > 0 &&
      searchableFields.length > 0
    ) {
      const term = searchTerm.trim();
      const orConditions = searchableFields.map((field) => buildSearchCondition(field, term));

      if (this.whereClause.OR && Array.isArray(this.whereClause.OR)) {
        this.whereClause.AND = [
          ...(Array.isArray(this.whereClause.AND) ? this.whereClause.AND : []),
          { OR: orConditions },
        ];
      } else {
        this.whereClause.OR = orConditions;
      }
    }

    return this;
  }

  /**
   * Applies dynamic filters from query parameters, skipping reserved keys
   * Supports range queries (_gte, _lte, min/max), booleans, numbers, and comma-separated arrays
   */
  public filter(options: IFilterOptions = {}): this {
    const excludeKeys = new Set([...RESERVED_QUERY_KEYS, ...(options.exclude || [])]);

    for (const [key, value] of Object.entries(this.query)) {
      if (excludeKeys.has(key) || value === undefined || value === '') {
        continue;
      }

      // Check for range filter (_gte, _lte, minX, maxX)
      const range = parseRangeFilter(key, value);
      if (range) {
        const existing = this.whereClause[range.targetKey];
        const existingObj = typeof existing === 'object' && existing !== null ? existing : {};
        this.whereClause[range.targetKey] = {
          ...existingObj,
          ...range.condition,
        };
        continue;
      }

      // Standard filter (scalar or nested path)
      const parsedValue = parseFilterValue(value);
      if (key.includes('.')) {
        const nestedObj = buildNestedPathObject(key, parsedValue);
        Object.assign(this.whereClause, nestedObj);
      } else {
        this.whereClause[key] = parsedValue;
      }
    }

    return this;
  }

  /**
   * Manually adds custom or programmatic conditions (e.g. branch scoping, deletedAt checks)
   */
  public where(customConditions: Record<string, unknown>): this {
    if (customConditions && typeof customConditions === 'object') {
      Object.assign(this.whereClause, customConditions);
    }
    return this;
  }

  /**
   * Configures sorting by 'sortBy'/'sort' and 'sortOrder'/'order'
   * Supports multi-field comma sorting (e.g. 'sortBy=createdAt:desc,name:asc' or 'sort=-createdAt,name')
   */
  public sort(defaultSortBy = 'createdAt', defaultSortOrder: SortOrder = 'desc'): this {
    const rawSort = (this.query.sortBy || this.query.sort) as string | undefined;
    const rawOrder = (this.query.sortOrder || this.query.order) as SortOrder | undefined;

    if (!rawSort) {
      this.orderByClause.push(buildNestedPathObject(defaultSortBy, defaultSortOrder));
      return this;
    }

    const sortFields = rawSort.split(',');
    for (const expr of sortFields) {
      const parsed = parseSortExpression(expr, rawOrder || defaultSortOrder);
      if (parsed) {
        this.orderByClause.push(buildNestedPathObject(parsed.field, parsed.order));
      }
    }

    return this;
  }

  /**
   * Configures pagination parameters (page, limit, skip, take) with safe boundary clamping
   */
  public paginate(defaultPage = 1, defaultLimit = 10, maxLimit = 100): this {
    const parsedPage = Number(this.query.page);
    const parsedLimit = Number(this.query.limit);

    this.pageNumber = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : defaultPage;
    const rawLimit = Number.isInteger(parsedLimit) && parsedLimit > 0 ? parsedLimit : defaultLimit;
    this.limitNumber = Math.min(rawLimit, maxLimit);

    this.skipCount = (this.pageNumber - 1) * this.limitNumber;
    return this;
  }

  /**
   * Builds and returns the structured Prisma query arguments
   */
  public build(): IPrismaQueryParams {
    return {
      where: this.whereClause,
      orderBy:
        this.orderByClause.length === 1
          ? (this.orderByClause[0] as Record<string, unknown>)
          : this.orderByClause,
      skip: this.skipCount,
      take: this.limitNumber,
    };
  }

  /**
   * Computes standardized pagination metadata given the total record count
   */
  public getPaginationMeta(total: number): IPaginationMeta {
    const safeTotal = Math.max(0, total);
    const totalPage = this.limitNumber > 0 ? Math.ceil(safeTotal / this.limitNumber) : 1;

    return {
      page: this.pageNumber,
      limit: this.limitNumber,
      total: safeTotal,
      totalPage,
      hasNextPage: this.pageNumber < totalPage,
      hasPrevPage: this.pageNumber > 1,
    };
  }

  // Getters for individual components
  public get whereCondition(): Record<string, unknown> {
    return this.whereClause;
  }

  public get orderByCondition(): Record<string, unknown> | Array<Record<string, unknown>> {
    return this.orderByClause.length === 1
      ? (this.orderByClause[0] as Record<string, unknown>)
      : this.orderByClause;
  }

  public get skip(): number {
    return this.skipCount;
  }

  public get take(): number {
    return this.limitNumber;
  }

  public get page(): number {
    return this.pageNumber;
  }

  public get limit(): number {
    return this.limitNumber;
  }
}
