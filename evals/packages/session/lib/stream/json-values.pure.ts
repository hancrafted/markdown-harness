// Reading untyped JSON without throwing: a value of the wrong shape reads as an empty one, because a stream
// parser reports a missing key by name and never crashes on it.

import type { Json } from './json-values.types.ts';

export const asRecord = (value: unknown): Json =>
  typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Json) : {};
export const asString = (value: unknown): string => (typeof value === 'string' ? value : '');
export const asList = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

/** One line of newline-delimited JSON as an object, or undefined when it is not one. */
export function parseLine(text: string): Json | undefined {
  try {
    const value: unknown = JSON.parse(text);
    return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Json) : undefined;
  } catch {
    return undefined;
  }
}

/** The keys of `keys` that `line` lacks, each prefixed by `label`; none when there is no such line to check. */
export function missingFrom(line: Json | undefined, keys: readonly string[], label: string): string[] {
  return line === undefined ? [] : keys.filter((key) => !(key in line)).map((key) => `${label}.${key}`);
}
