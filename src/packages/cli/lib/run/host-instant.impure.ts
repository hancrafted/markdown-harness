/**
 * The host clock, read once, as an Assessment instant.
 *
 * This file exists so that exactly one place in the product reads a clock, and
 * so that place is nameable. Everything downstream takes the instant as an
 * argument, which is what lets `--assess` consult a date without giving up the
 * guarantee that the same tree gives the same result out: pin `--now` and the
 * clock is never read at all.
 *
 * Its one ambient read is the clock, and it does nothing else.
 */

/**
 * Now, in the notation `--now` accepts.
 *
 * `toISOString` is UTC by definition and always carries the `Z` offset, so the
 * value it returns is one `--now` would have accepted from a caller — which is
 * what makes a defaulted run reproducible: copy the echoed instant back onto
 * the command line and the answer cannot change.
 */
export function hostInstant(): string {
  return new Date().toISOString();
}
