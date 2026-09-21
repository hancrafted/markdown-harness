/**
 * Turn config bytes into a mapping, or say why they are not one.
 *
 * Deterministic: the same bytes yield the same answer, so this carries the
 * `pure` classifier despite the `try`. `yaml` is an ordinary dependency rather
 * than a platform builtin, which is what keeps it admissible here.
 */

import { parse } from 'yaml';
import type { ConfigParse } from './config-load.types.ts';

/**
 * A mapping is the only top-level shape the config language admits.
 *
 * Arrays are excluded explicitly: `typeof [] === 'object'`, so a config written
 * as a list would otherwise pass a bare object check and fail much later, with
 * a fault naming a key rather than the file.
 */
function isMapping(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Parse config bytes into a mapping.
 *
 * @param text The file's contents.
 * @param location The config path exactly as the caller wrote it — never resolved.
 */
export function parseConfigDocument(text: string, location: string): ConfigParse {
  const notYaml = { faults: [{ code: 'CONFIG_NOT_YAML', location }] } as const;

  let parsed: unknown;
  try {
    parsed = parse(text);
  } catch {
    // The parser's own message is deliberately dropped: §4 stores no prose of
    // ours, and a fault is code plus location.
    return notYaml;
  }

  return isMapping(parsed) ? { document: parsed, faults: [] } : notYaml;
}
