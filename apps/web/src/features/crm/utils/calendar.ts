export function toDayKey(value: Date | string): string {
  return new Date(value).toDateString();
}

export function toIsoDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function fromIsoDateKey(dateKey: string | null | undefined): Date | null {
  if (!dateKey) {
    return null;
  }

  const [year, month, day] = dateKey.split("-").map(Number);
  if (!year || !month || !day) {
    return null;
  }

  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function groupItemsByDayKey<T>(
  items: T[],
  getDateValue: (item: T) => Date | string | null | undefined,
): Map<string, T[]> {
  const map = new Map<string, T[]>();

  for (const item of items) {
    const dateValue = getDateValue(item);
    if (!dateValue) {
      continue;
    }

    const dateKey = toDayKey(dateValue);
    const existing = map.get(dateKey) ?? [];
    existing.push(item);
    map.set(dateKey, existing);
  }

  return map;
}

export function getDatesFromDayKeys(dayKeys: Iterable<string>): Date[] {
  return Array.from(dayKeys)
    .map((dayKey) => new Date(dayKey))
    .filter((date) => !Number.isNaN(date.getTime()));
}