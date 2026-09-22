/**
 * Turn YAML bytes into a mapping, or say that they did not become one.
 *
 * This is the one place `yaml` is imported for production code. Deterministic:
 * the same bytes and the same policy yield the same answer, so this carries
 * the `pure` classifier despite the `try`. `yaml` is an ordinary dependency
 * rather than a platform builtin, which is what keeps it admissible here —
 * `package.json` pins one version, and this is the one place that pin is
 * exercised.
 *
 * The parser's own message is deliberately dropped on every failure path: a
 * fault in this tool's catalog is a code plus a location, never prose, so
 * carrying the message forward would give it nowhere to live.
 *
 * `emptyDocument` is deliberate rather than decided here once and for all.
 * `parse('')` — and a block holding only a comment — returns `undefined` or
 * `null` rather than throwing, and this repository's two YAML readers used to
 * each hand-roll their own answer to what that means, byte-identical
 * everywhere else. Reconciling that into one hard-coded answer was
 * considered and rejected for both directions:
 *
 * - Always a fault would break the frontmatter spec, which is explicit that
 *   an immediately-closed fence (`---` then `---`) PARSES, to `{}` — a
 *   Conformance-covered case, not a refactor's to change.
 * - Always a mapping would silently accept an empty config file as "a config
 *   with no rules" — exactly the case `config-document.pure.ts`'s own test
 *   names and guards against today. Config's current behaviour is a
 *   deliberate safety gate, not an oversight, and changing what an Operator's
 *   config is allowed to be is a product decision this ticket does not make.
 *
 * So the decision is made once, here, as a named argument every caller must
 * supply rather than an implicit default: `'fault'` for a caller for which
 * emptiness is not content, `'empty-mapping'` for one for which it is. Each
 * caller passes its own answer at its own call site, and that answer is now
 * the only thing about the empty-document question that is caller-specific —
 * the parse, the try, the dropped message and the mapping narrowing are not.
 */

import { parse } from 'yaml';
import type { EmptyDocumentPolicy, YamlDocumentResult } from './yaml-document.types.ts';
import { isMapping } from './yaml-mapping.pure.ts';

const FAULT: YamlDocumentResult = { kind: 'fault' };

/**
 * @param text The document's bytes.
 * @param emptyDocument What a document that parses to nothing (`undefined` or
 *   `null`, never thrown) means for this caller — see this file's own
 *   docblock for why the two existing callers disagree and why that
 *   disagreement is kept explicit rather than settled once for both.
 */
export function parseYamlDocument(text: string, emptyDocument: EmptyDocumentPolicy): YamlDocumentResult {
  let parsed: unknown;
  try {
    parsed = parse(text);
  } catch {
    return FAULT;
  }

  if (parsed === null || parsed === undefined) {
    return emptyDocument === 'empty-mapping' ? { kind: 'mapping', document: {} } : FAULT;
  }

  return isMapping(parsed) ? { kind: 'mapping', document: parsed } : FAULT;
}
