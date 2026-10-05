/**
 * The four commands that report, in the order the synopsis lists them.
 *
 * The one place the command words are written. `ReportingCommand` is derived
 * from this list, and both the argv parser and the Module-port reading in
 * `module-answers.pure.ts` iterate it, so a command added here reaches the
 * type, the parser and the port together.
 */
export const REPORTING_COMMANDS = ['check', 'query', 'audit', 'assess'] as const;
