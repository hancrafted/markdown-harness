/**
 * The three frontmatter fields an entry is built from.
 *
 * The fields are FIXED — `title`, `name`, `description` — in the same way the
 * description was fixed at frontmatter rather than the body. There is no
 * `titleSource:` key to match `descriptionSource:`, and that was declined
 * rather than never proposed: the link-text chain is a property of the
 * language, not of one adopter's tree.
 *
 * PARSED, never raw. `description: >-` folded over three indented lines has no
 * byte-identical single-line form, and the folded string is the only
 * single-line value that exists — so "copied byte for byte" means byte for byte
 * out of the parser, never out of the file.
 *
 * KNOWN DUPLICATION, recorded rather than hidden: the fence-finding below is a
 * second implementation of `frontmatter-harness/lib/check/frontmatter-block.pure.ts`,
 * which this Package may not import because it is another Package's internal.
 * Promoting it to a Package of its own is a real finding of this prototype and
 * is in the findings note; a second Module reading frontmatter is exactly the
 * pressure that makes the case.
 */

import { parse } from 'yaml';
import type { DescriptorFields } from './entries.types.ts';

/** The only fence this tool reads. */
const FENCE = '---';

/** Editors and Windows tooling both write these; neither means the block is absent. */
const BYTE_ORDER_MARK = '﻿';

/** Nothing was readable. Named so the empty case is not a bare literal. */
const NO_FIELDS: DescriptorFields = {};

/** A fence line, allowing for the trailing bytes a real file carries. */
function isFence(line: string | undefined): boolean {
  return line !== undefined && line.trimEnd() === FENCE;
}

/** Only a string is copyable; a number or a list under `title` is not a name. */
function stringAt(mapping: Record<string, unknown>, key: string): string | undefined {
  const value = mapping[key];
  return typeof value === 'string' ? value : undefined;
}

function isMapping(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * The text between a file's opening and closing fences, if it has both.
 *
 * The opening fence must be the FIRST line: a `---` further down a document is
 * a horizontal rule, and reading one as frontmatter would invent a block the
 * author never wrote. The closing fence is the first one after it, for the same
 * reason in reverse — the last would swallow the body.
 */
function frontmatterText(text: string): string | undefined {
  const body = text.startsWith(BYTE_ORDER_MARK) ? text.slice(BYTE_ORDER_MARK.length) : text;
  const lines = body.split('\n');
  if (!isFence(lines[0])) return undefined;

  const closing = lines.findIndex((line, index) => index > 0 && isFence(line));
  return closing === -1 ? undefined : lines.slice(1, closing).join('\n');
}

/**
 * Read the three fields out of one file's frontmatter.
 *
 * Every failure answers the same way — no fields — and deliberately so. A file
 * with no frontmatter, an unterminated block, and bytes that will not parse are
 * three different findings for the `frontmatter:` Module, and NONE of them is
 * this Module's business: absence degrades an entry to name-only and this
 * Module reports nothing about it. One missing `description` cannot yield two
 * findings from two Modules, because this one never reports on `description` at
 * all.
 *
 * @param text The file's full contents.
 */
export function descriptorFields(text: string): DescriptorFields {
  const block = frontmatterText(text);
  if (block === undefined) return NO_FIELDS;

  let parsed: unknown;
  try {
    parsed = parse(block);
  } catch {
    return NO_FIELDS;
  }

  if (!isMapping(parsed)) return NO_FIELDS;

  return {
    title: stringAt(parsed, 'title'),
    name: stringAt(parsed, 'name'),
    description: stringAt(parsed, 'description'),
  };
}
