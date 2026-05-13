interface CronField {
  values: Set<number>;
  wildcard: boolean;
}

interface ParsedCronExpression {
  minute: CronField;
  hour: CronField;
  dayOfMonth: CronField;
  month: CronField;
  dayOfWeek: CronField;
}

export interface CronValidation {
  ok: boolean;
  error?: string;
}

const weekdayMap: Record<string, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

export function validateCronExpression(expression: string): CronValidation {
  const parsed = parseCronExpression(expression);

  if (!parsed.ok) {
    return {
      ok: false,
      error: parsed.error,
    };
  }

  return { ok: true };
}

export function isCronExpressionFiveMinuteCompatible(expression: string): boolean {
  const parsed = parseCronExpression(expression);

  if (!parsed.ok) {
    return false;
  }

  for (const minute of parsed.value.minute.values) {
    if (minute % 5 !== 0) {
      return false;
    }
  }

  return parsed.value.minute.values.size > 0;
}

export function matchCronExpression(expression: string, date: Date, timezone: string): boolean {
  const parsed = parseCronExpression(expression);

  if (!parsed.ok) {
    return false;
  }

  const local = getLocalDateTime(date, timezone);
  const minuteMatch = parsed.value.minute.values.has(local.minute);
  const hourMatch = parsed.value.hour.values.has(local.hour);
  const monthMatch = parsed.value.month.values.has(local.month);
  const dayOfMonthMatch = parsed.value.dayOfMonth.values.has(local.dayOfMonth);
  const dayOfWeekMatch = parsed.value.dayOfWeek.values.has(local.dayOfWeek);

  if (!minuteMatch || !hourMatch || !monthMatch) {
    return false;
  }

  if (parsed.value.dayOfMonth.wildcard && parsed.value.dayOfWeek.wildcard) {
    return true;
  }

  if (parsed.value.dayOfMonth.wildcard) {
    return dayOfWeekMatch;
  }

  if (parsed.value.dayOfWeek.wildcard) {
    return dayOfMonthMatch;
  }

  return dayOfMonthMatch || dayOfWeekMatch;
}

function parseCronExpression(expression: string): { ok: true; value: ParsedCronExpression } | { ok: false; error: string } {
  const fields = expression.trim().split(/\s+/);

  if (fields.length !== 5) {
    return { ok: false, error: "expected 5 fields" };
  }

  const [minuteField, hourField, dayOfMonthField, monthField, dayOfWeekField] = fields;

  if (!minuteField || !hourField || !dayOfMonthField || !monthField || !dayOfWeekField) {
    return { ok: false, error: "missing cron field" };
  }

  const minute = parseField(minuteField, 0, 59, false);
  if (!minute.ok) return minute;
  const hour = parseField(hourField, 0, 23, false);
  if (!hour.ok) return hour;
  const dayOfMonth = parseField(dayOfMonthField, 1, 31, false);
  if (!dayOfMonth.ok) return dayOfMonth;
  const month = parseField(monthField, 1, 12, false);
  if (!month.ok) return month;
  const dayOfWeek = parseField(dayOfWeekField, 0, 7, true);
  if (!dayOfWeek.ok) return dayOfWeek;

  return {
    ok: true,
    value: {
      minute: minute.value,
      hour: hour.value,
      dayOfMonth: dayOfMonth.value,
      month: month.value,
      dayOfWeek: dayOfWeek.value,
    },
  };
}

function parseField(rawField: string, min: number, max: number, isDayOfWeek: boolean): { ok: true; value: CronField } | { ok: false; error: string } {
  const field = rawField.trim().toLowerCase();

  if (!field) {
    return { ok: false, error: "empty cron field" };
  }

  const values = new Set<number>();
  const segments = field.split(",");
  let wildcard = false;

  for (const segment of segments) {
    const token = segment.trim();

    if (!token) {
      return { ok: false, error: "invalid empty list token" };
    }

    const [basePart, stepPart] = token.split("/");
    const base = basePart?.trim() ?? "";

    if (!base) {
      return { ok: false, error: "invalid step token" };
    }

    let step = 1;
    if (stepPart !== undefined) {
      if (!/^\d+$/.test(stepPart)) {
        return { ok: false, error: "step must be an integer" };
      }

      step = Number(stepPart);
      if (!Number.isFinite(step) || step <= 0) {
        return { ok: false, error: "step must be greater than 0" };
      }
    }

    let start: number;
    let end: number;

    if (base === "*") {
      start = min;
      end = max;
      wildcard = true;
    } else if (base.includes("-")) {
      const [rawStart, rawEnd] = base.split("-");
      if (!rawStart || !rawEnd) {
        return { ok: false, error: "invalid range syntax" };
      }

      const parsedStart = parseFieldValue(rawStart, isDayOfWeek);
      const parsedEnd = parseFieldValue(rawEnd, isDayOfWeek);

      if (parsedStart === undefined || parsedEnd === undefined) {
        return { ok: false, error: "range contains non-numeric value" };
      }

      start = parsedStart;
      end = parsedEnd;

      if (start > end) {
        return { ok: false, error: "range start must be less than or equal to range end" };
      }
    } else {
      const parsedValue = parseFieldValue(base, isDayOfWeek);
      if (parsedValue === undefined) {
        return { ok: false, error: "field contains non-numeric value" };
      }

      start = parsedValue;
      end = parsedValue;
    }

    if (start < min || end > max) {
      return { ok: false, error: `field out of range (${min}-${max})` };
    }

    for (let value = start; value <= end; value += step) {
      const normalized = isDayOfWeek && value === 7 ? 0 : value;
      values.add(normalized);
    }
  }

  if (values.size === 0) {
    return { ok: false, error: "cron field produced no values" };
  }

  return {
    ok: true,
    value: {
      values,
      wildcard,
    },
  };
}

function parseFieldValue(value: string, isDayOfWeek: boolean): number | undefined {
  const normalized = value.trim().toLowerCase();

  if (isDayOfWeek && weekdayMap[normalized] !== undefined) {
    return weekdayMap[normalized];
  }

  if (!/^\d+$/.test(normalized)) {
    return undefined;
  }

  return Number(normalized);
}

function getLocalDateTime(date: Date, timezone: string): {
  month: number;
  dayOfMonth: number;
  hour: number;
  minute: number;
  dayOfWeek: number;
} {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const weekdayName = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
  }).format(date);
  const weekdayNumber = weekdayMap[weekdayName.toLowerCase().slice(0, 3)] ?? 0;

  return {
    month: Number(getPart(parts, "month")),
    dayOfMonth: Number(getPart(parts, "day")),
    hour: Number(getPart(parts, "hour")),
    minute: Number(getPart(parts, "minute")),
    dayOfWeek: weekdayNumber,
  };
}

function getPart(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
  return parts.find((part) => part.type === type)?.value ?? "0";
}
