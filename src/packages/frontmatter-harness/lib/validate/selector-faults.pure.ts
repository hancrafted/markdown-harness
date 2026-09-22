/**
 * Validate the selector half of one rule: the two axes, their tokens, and the
 * exclusions written in the same vocabulary.
 *
 * Its own file rather than a section of `rule-faults.pure.ts`, because the
 * selector is the one part of a rule that is not about frontmatter at all. It
 * is the config language's way of naming files, it is what a second Module
 * would reach for unchanged, and it is the half this repository just rewrote —
 * so a reviewer reading the grammar reads one file rather than picking it out
 * of the rule vocabulary around it.
 *
 * Every fault here points at the KEY as written and never at an offending
 * index. One bad token makes the whole axis unusable, so an indexed fault would
 * ask for the same repair once per element.
 */

import type { ConfigFault } from '../../../response-contract/index.ts';

/** The two axes, named once so the presence checks and the token checks agree. */
const SELECTOR_AXES: readonly string[] = ['folders', 'fileNames'];

/** The separator a folder token must end in and a file name must not carry. */
const SEPARATOR = '/';

/** The corpus root's own token, the one folder with no name of its own. */
const ROOT_FOLDER = './';

/**
 * Glob syntax characters from the retired matcher that the config language
 * refuses in any selector token:
 * - `*` and `?`: wildcards (match-any, single-character)
 * - `[` and `]`: character classes
 * - `{` and `}`: brace expansions / alternatives
 *
 * Chosen because an Operator migrating from glob syntax might paste one of
 * these into the new literal selector grammar. Without this refusal, a token
 * like `docs/*\/` or `*.md` would be accepted as a literal token matching
 * nothing on disk, silently leaving documents ungoverned.
 *
 * Kept to exactly these six characters rather than forbidding all non-alphanumeric
 * characters: filesystem paths and file names legitimately carry characters like
 * `-`, `_`, `.`, and `@`.
 */
const REFUSED_GLOB_CHARACTERS: readonly string[] = ['*', '?', '[', ']', '{', '}'];

/** Whether one token carries any refused glob / wildcard character. */
function carriesWildcard(token: string): boolean {
  return REFUSED_GLOB_CHARACTERS.some((character) => token.includes(character));
}

function isMapping(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function invalid(location: string): ConfigFault {
  return { code: 'CONFIG_INVALID_VALUE', location };
}

/**
 * A list of strings, which is what a selector axis holds.
 *
 * An empty list is a list of strings. It names no folders and no names, which
 * is a different thing from naming a wrong one — and a different thing again
 * from leaving the key out, which means every.
 */
function isStringList(value: unknown): boolean {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

/**
 * Whether one folder token is spelled the one way a folder is spelled.
 *
 * The mandatory trailing separator is what keeps `docs/vision/` from
 * prefix-matching `docs/visionary/`, and what makes a folder token
 * unmistakable for a file name at a glance. `./` is allowed the dot segment no
 * other token may carry, because the corpus root is the one folder with no name
 * of its own and the empty string is not a token anyone can write.
 */
function isFolderToken(token: string): boolean {
  if (carriesWildcard(token)) return false;
  if (token === ROOT_FOLDER) return true;
  if (!token.endsWith(SEPARATOR)) return false;
  if (token.startsWith(SEPARATOR)) return false;
  return !token.split(SEPARATOR).some((segment, index, segments) => segment === '' && index < segments.length - 1);
}

/** Whether one file name is a basename rather than a path. */
function isFileNameToken(token: string): boolean {
  if (carriesWildcard(token)) return false;
  return token !== '' && !token.includes(SEPARATOR);
}

/**
 * At least one of `folders` / `fileNames`.
 *
 * Both together is no longer a mistake — it is the intersection, and the way an
 * exact path is spelled. So the old ambiguity has nothing left to report and
 * `CONFIG_SELECTOR_MISSING` is the only selector fault there is, redefined from
 * "neither `path` nor `fileName`" to "neither axis".
 *
 * A rule carrying neither selects nothing and governs nothing. Without a fault
 * an Operator gets a green run over a rule that never fires, and reads
 * compliance out of its absence.
 *
 * @param rule One entry of the rule list, straight off the YAML.
 * @param at The rule's address in the config's own notation.
 */
export function selectorFaults(rule: Record<string, unknown>, at: string): readonly ConfigFault[] {
  if (SELECTOR_AXES.some((axis) => axis in rule)) return [];
  return [{ code: 'CONFIG_SELECTOR_MISSING', location: at }];
}

/**
 * Tokens the axis vocabulary refuses, reported at the axis.
 *
 * Only lists that already read as lists of strings are examined, so a wrongly
 * shaped axis earns one fault rather than two.
 *
 * @param selector A rule or an exclusion, straight off the YAML.
 * @param at The address whose `.folders` / `.fileNames` are being reported.
 */
export function tokenFaults(selector: Record<string, unknown>, at: string): readonly ConfigFault[] {
  return SELECTOR_AXES.filter((axis) => {
    const written = selector[axis];
    if (!isStringList(written)) return false;
    const wellFormed = axis === 'folders' ? isFolderToken : isFileNameToken;
    return (written as readonly string[]).some((token) => !wellFormed(token));
  }).map((axis) => invalid(`${at}.${axis}`));
}

/**
 * Exclusions, held to the same vocabulary and the same at-least-one rule.
 *
 * One language rather than two, which is why this delegates to the same token
 * checks an include axis gets. Every fault points at `excludeFiles` rather than
 * at an entry: an exclusion list reads as one statement about what this rule
 * gives back, and a reader repairing it opens the whole key.
 *
 * @param rule One entry of the rule list, straight off the YAML.
 * @param at The rule's address in the config's own notation.
 */
export function exclusionFaults(rule: Record<string, unknown>, at: string): readonly ConfigFault[] {
  if (!('excludeFiles' in rule)) return [];
  const written = rule.excludeFiles;
  const location = `${at}.excludeFiles`;
  if (!Array.isArray(written) || !written.every(isMapping)) return [invalid(location)];

  const misshapen = written.some((exclusion) =>
    SELECTOR_AXES.some((axis) => axis in exclusion && !isStringList(exclusion[axis])),
  );
  if (misshapen) return [invalid(location)];

  const axisless = written.some((exclusion) => !SELECTOR_AXES.some((axis) => axis in exclusion));
  if (axisless) return [{ code: 'CONFIG_SELECTOR_MISSING', location }];

  const malformed = written.some((exclusion) => tokenFaults(exclusion, at).length > 0);
  return malformed ? [invalid(location)] : [];
}
