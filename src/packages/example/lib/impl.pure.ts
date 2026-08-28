/**
 * The instant arrives as an argument, so this file never reads the clock, and
 * only the `getUTC*` accessors are admissible — the local accessors resolve
 * through the host time zone, which is an ambient read.
 */
export function toUtcDay(instant: number): string {
  const at = new Date(instant);
  const month = String(at.getUTCMonth() + 1).padStart(2, '0');
  const day = String(at.getUTCDate()).padStart(2, '0');
  return `${at.getUTCFullYear()}-${month}-${day}`;
}

export function isSameUtcDay(a: number, b: number): boolean {
  return toUtcDay(a) === toUtcDay(b);
}
