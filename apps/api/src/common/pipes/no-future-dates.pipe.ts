import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

type UnknownRecord = Record<string, unknown>;

const isPlainObject = (value: unknown): value is UnknownRecord => {
  if (value === null || typeof value !== 'object') return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
};

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

// Accept common ISO-8601 datetime strings (with optional seconds/millis and timezone)
const ISO_DATETIME_RE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})?$/;

const getTodayUtcDateOnly = (now: Date = new Date()): string => {
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Fields that are allowed to have future dates (e.g., planning/expected dates)
const FUTURE_ALLOWED_FIELDS = new Set([
  'requiredDate',
  'required_date',
  'followUpDate',
  'follow_up_date',
  'responseDate',
  'response_date',
  'expectedDelivery',
  'expectedDeliveryDate',
  'expected_delivery_date',
  'estimatedDeliveryDate',
  'estimated_delivery_date',
  'responseDeadline',
  'response_deadline',
  'dueDate',
  'due_date',
  'plannedDate',
  'planned_date',
  'targetDate',
  'target_date',
  'expectedDate',
  'expected_date',
  'scheduledDate',
  'scheduled_date',
]);

const assertNoFutureDateString = (value: string, path: string) => {
  const trimmed = value.trim();
  if (!trimmed) return;

  // Extract the field name from the path (e.g., "requiredDate" from "body.requiredDate")
  const fieldName = path.split('.').pop() || '';
  
  // Skip validation if this field is allowed to have future dates
  if (FUTURE_ALLOWED_FIELDS.has(fieldName)) {
    return;
  }

  if (DATE_ONLY_RE.test(trimmed)) {
    // Compare lexicographically since YYYY-MM-DD sorts naturally.
    const todayUtc = getTodayUtcDateOnly();
    if (trimmed > todayUtc) {
      throw new BadRequestException(
        `Future dates are not allowed. Field "${path}" has value "${trimmed}" (today is ${todayUtc}).`,
      );
    }
    return;
  }

  if (ISO_DATETIME_RE.test(trimmed)) {
    const parsed = Date.parse(trimmed);
    if (!Number.isFinite(parsed)) return;

    const now = Date.now();
    if (parsed > now) {
      throw new BadRequestException(
        `Future dates are not allowed. Field "${path}" has value "${trimmed}" which is later than now.`,
      );
    }
  }
};

const walk = (value: unknown, path: string) => {
  if (typeof value === 'string') {
    assertNoFutureDateString(value, path);
    return;
  }

  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      walk(value[i], `${path}[${i}]`);
    }
    return;
  }

  if (isPlainObject(value)) {
    for (const [key, child] of Object.entries(value)) {
      walk(child, path ? `${path}.${key}` : key);
    }
  }
};

@Injectable()
export class NoFutureDatesPipe implements PipeTransform {
  transform(value: unknown) {
    // This pipe is applied globally (body + query), so handle primitives safely.
    walk(value, '');
    return value;
  }
}
