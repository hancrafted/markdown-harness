/**
 * Turn config bytes into a mapping, or say why they are not one.
 *
 * The parse itself, the try, and the mapping gate live in `lib/yaml/`
 * (published from this Package's own `yaml-document.ts` entry point) rather
 * than here: `frontmatter-data.pure.ts` in frontmatter-harness used to
 * hand-roll the identical three steps. The one place the two readers
 * disagree — what an empty document means — is why that seam takes an
 * explicit `EmptyDocumentPolicy` rather than a single hard-coded answer; this
 * caller passes `'fault'`; see the seam's own docblock for the full reasoning
 * on both sides.
 *
 * An empty config file parses to `undefined` rather than throwing, and
 * `'fault'` is what keeps that from reading as "a config with no rules" —
 * `config-document.test.ts` names this case and guards it deliberately, not
 * as an oversight this refactor should smooth over.
 */

import { parseYamlDocument } from '../yaml/yaml-document.pure.ts';
import type { ConfigParse } from './config-load.types.ts';

/**
 * Parse config bytes into a mapping.
 *
 * @param text The file's contents.
 * @param location The config path exactly as the caller wrote it — never resolved.
 */
export function parseConfigDocument(text: string, location: string): ConfigParse {
  const result = parseYamlDocument(text, 'fault');
  if (result.kind === 'fault') {
    return { faults: [{ code: 'CONFIG_NOT_YAML', location }] };
  }
  return { document: result.document, faults: [] };
}
