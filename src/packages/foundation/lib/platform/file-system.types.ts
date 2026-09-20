/**
 * Result of reading a file through the platform filesystem gate.
 */

export type ReadOutcome = { kind: 'text'; text: string } | { kind: 'absent' } | { kind: 'unreadable' };
