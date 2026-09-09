/**
 * Whether `--now` named an instant this tool can compare against.
 *
 * The **Assessment instant** is the moment an assessment is judged against. It
 * arrives as an argument and is echoed in the answer exactly as written, which
 * is what keeps a clock-reading command reproducible by hand: the same tree and
 * the same `--now` give the same result out.
 *
 * DECIDED BY ARITHMETIC, not by `Date.parse`, and that is a measurement rather
 * than a preference. Measured on Node 26.5.0: `Date.parse` refuses month 13,
 * day 32, minute 60 and a `+24:00` offset — and SILENTLY ROLLS OVER a day the
 * month does not have. `2026-02-30T00:00:00Z` parses to March 2nd and
 * `2026-12-01T24:00:00Z` to the next midnight. Either would be fatal here for
 * one reason: `now` is echoed as the caller wrote it, so a rollover would print
 * one instant and compare against another, and the answer would no longer be
 * reproducible by hand.
 *
 * So every bound is checked here against the digits themselves. Nothing in this
 * file reaches `Date` at all, which also puts it beyond the reach of an engine
 * changing its mind about a lenient parse.
 */

/**
 * A date, `T`, a time to full seconds, an optional fractional part, then an
 * EXPLICIT offset of `Z` or `±hh:mm`.
 *
 * Anchored, and the offset is mandatory: an instant with no offset is a local
 * time, which resolves through the host time zone — the ambient read this
 * argument exists to remove. Lowercase `t` and `z` are accepted, the leniency
 * RFC 3339 grants. The digit COUNTS are all this expression settles; every
 * range below is arithmetic.
 */
const INSTANT = /^(\d{4})-(\d{2})-(\d{2})[Tt](\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:[Zz]|([+-])(\d{2}):(\d{2}))$/;

/** Days per month in a common year, January first. February is decided by the leap rule. */
const MONTH_LENGTHS: readonly number[] = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** The proleptic Gregorian leap rule, in full: every fourth year, except centuries, except every fourth century. */
function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

/** How many days the month actually has, which is the bound `Date.parse` does not hold. */
function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return MONTH_LENGTHS[month - 1];
}

/** Whether a value sits within an inclusive range. */
function within(value: number, low: number, high: number): boolean {
  return value >= low && value <= high;
}

/** The calendar half: a real month, and a day that month actually has. */
function namesADay(year: string, month: string, day: string): boolean {
  if (!within(Number(month), 1, 12)) return false;
  return within(Number(day), 1, daysInMonth(Number(year), Number(month)));
}

/**
 * The wall-clock half.
 *
 * Hour 24 is refused. RFC 3339 permits it as a spelling of the next midnight,
 * but this argument is echoed verbatim, and an instant printed as one day and
 * compared as the next is the one thing this check exists to prevent.
 */
function namesATime(hour: string, minute: string, second: string): boolean {
  return within(Number(hour), 0, 23) && within(Number(minute), 0, 59) && within(Number(second), 0, 59);
}

/** The offset half. Absent for the `Z` spelling, which carries no numbers to bound. */
function namesAnOffset(offsetHour: string | undefined, offsetMinute: string | undefined): boolean {
  if (offsetHour === undefined || offsetMinute === undefined) return true;
  return within(Number(offsetHour), 0, 23) && within(Number(offsetMinute), 0, 59);
}

/**
 * Whether a `--now` value is an Assessment instant.
 *
 * @param value The `--now` argument, exactly as the caller wrote it.
 */
export function isAssessmentInstant(value: string): boolean {
  const found = INSTANT.exec(value);
  if (found === null) return false;

  const [, year, month, day, hour, minute, second, , offsetHour, offsetMinute] = found;

  return namesADay(year, month, day) && namesATime(hour, minute, second) && namesAnOffset(offsetHour, offsetMinute);
}
