/**
 * Turn config bytes into a mapping, or say why they are not one.
 */

import { parse } from 'yaml';
import type { ConfigParse } from './config-load.types.ts';

function isMapping(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Parse config bytes into a mapping.
 *
 * @param text The file's contents.
 * @param location The config path as written by the caller.
 */
export function parseConfigDocument(text: string, location: string): ConfigParse {
  const notYaml = { faults: [{ code: 'CONFIG_NOT_YAML' as const, location }] };

  let parsed: unknown;
  try {
    parsed = parse(text);
  } catch {
    return notYaml;
  }

  return isMapping(parsed) ? { document: parsed, faults: [] } : notYaml;
}
