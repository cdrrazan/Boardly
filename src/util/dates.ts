const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Fractional number of days from `from` to `to` (negative if `to` precedes `from`). */
export function daysBetween(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / MS_PER_DAY;
}

/** Fractional number of hours from `from` to `to` (negative if `to` precedes `from`). */
export function hoursBetween(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / (60 * 60 * 1000);
}

/** End date (exclusive) of an iteration given its start date and duration in days. */
export function iterationEnd(startDate: string, durationDays: number): Date {
  const start = new Date(`${startDate}T00:00:00Z`);
  return new Date(start.getTime() + durationDays * MS_PER_DAY);
}

/** True if `now` falls on or after the iteration's end. */
export function iterationHasEnded(startDate: string, durationDays: number, now: Date): boolean {
  return now.getTime() >= iterationEnd(startDate, durationDays).getTime();
}
