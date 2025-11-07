const MS_PER_MINUTE = 60 * 1000;

export interface ClientTimePayload {
  clientTimestamp?: string | null;
  timezoneOffsetMinutes?: number | null;
}

export function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    0,
    0,
    0,
    0,
  ));
}

export function resolveClientDay(payload: ClientTimePayload, fallback: Date = new Date()): {
  now: Date;
  startOfDay: Date;
} {
  let basis = fallback;
  if (payload.clientTimestamp) {
    const candidate = new Date(payload.clientTimestamp);
    if (!Number.isNaN(candidate.getTime())) {
      basis = candidate;
    }
  }

  const offset = typeof payload.timezoneOffsetMinutes === 'number' && !Number.isNaN(payload.timezoneOffsetMinutes)
    ? payload.timezoneOffsetMinutes
    : null;

  if (offset === null) {
    return { now: basis, startOfDay: startOfUtcDay(basis) };
  }

  const localTime = new Date(basis.getTime() - offset * MS_PER_MINUTE);
  const startOfLocalDay = new Date(Date.UTC(
    localTime.getUTCFullYear(),
    localTime.getUTCMonth(),
    localTime.getUTCDate(),
    0,
    0,
    0,
    0,
  ));

  return {
    now: basis,
    startOfDay: startOfLocalDay,
  };
}
