// The response's violation codes, as `cli` derives them from the declared Module set.
//
// The contracts are generic and each Module owns its codes, so the closed union
// a consumer narrows on exists only as a derivation over `MODULE_SET`. Two
// things are proved here, and the type checker holds the first:
//
// 1. The derived union is CLOSED. `CODES` is pinned against it from both
//    sides, so a union that widened to `string` — a Module answering `unknown`,
//    a contract losing its parameter — stops compiling, and so does a code a
//    Module adds without this file naming it, or a code listed here that no
//    Module can emit. `MINTED_BY` is keyed exhaustively by the same union.
// 2. Every code follows the `<MODULE>__<OUTCOME>` grammar for the Module that
//    mints it, under that Module's config key — so two Modules can never mint
//    the same code.
//
// Both lists are written by hand rather than read off the Modules: a list
// derived from the thing it checks agrees with every possible subject.

import { describe, expect, it } from 'vitest';
import type { DeclaredViolationCode } from '../declared-module.ts';
import { MODULE_SET } from '../module-set.ts';

const codes = [
  'FRONTMATTER__MISSING_REQUIRED_FIELD',
  'FRONTMATTER__EMPTY_REQUIRED_FIELD',
  'FRONTMATTER__FORBIDDEN_FIELD_PRESENT',
  'FRONTMATTER__VALUE_NOT_ALLOWED',
  'FRONTMATTER__FORMAT_MISMATCH',
  'FRONTMATTER__PATTERN_MISMATCH',
  'FRONTMATTER__VALUE_TOO_SHORT',
  'FRONTMATTER__VALUE_TOO_LONG',
  'FRONTMATTER__TOO_FEW_ITEMS',
  'FRONTMATTER__TOO_MANY_ITEMS',
  'FRONTMATTER__ITEM_TOO_LONG',
  'FRONTMATTER__CONSTRAINT_SHAPE_MISMATCH',
  'FRONTMATTER__UNKNOWN_KEY_FORBIDDEN',
  'FRONTMATTER__FRONTMATTER_FORBIDDEN',
  'FRONTMATTER__FRONTMATTER_UNPARSEABLE',
  'FRONTMATTER__EXACTLY_ONE_OF_NONE_PRESENT',
  'FRONTMATTER__EXACTLY_ONE_OF_MULTIPLE_PRESENT',
  'FRONTMATTER__ANY_OF_UNSATISFIED',
  'FRONTMATTER__ALL_OF_UNSATISFIED',
  'BODY_STRUCTURE__LEVEL_TOO_DEEP',
  'BODY_STRUCTURE__HEADING_UNDEFINED',
  'BODY_STRUCTURE__BLOCK_KIND_NOT_ALLOWED',
  'BODY_STRUCTURE__HEADING_MISSING',
  'BODY_STRUCTURE__HEADING_OUT_OF_ORDER',
  'BODY_STRUCTURE__HEADING_REPEATED',
  'BODY_STRUCTURE__ENUMERATION_BELOW_MINIMUM',
  'BODY_STRUCTURE__ENUMERATION_ABOVE_MAXIMUM',
] as const;

/** A code the derived union holds and the list above does not. */
type Unlisted = Exclude<DeclaredViolationCode, (typeof codes)[number]>;

/** Every code a response can carry, pinned against the derived union from both sides. */
const CODES = codes satisfies readonly DeclaredViolationCode[] & ([Unlisted] extends [never] ? unknown : never);

/**
 * The config key of the Module that mints each code — exhaustive over the derived union.
 *
 * A record rather than a `switch`: the two are the same proof (a missing code is
 * `TS2741`, a code no Module mints is `TS2353`), and a 27-way switch is a
 * function the complexity budget refuses. A record keyed by a union that widened
 * to `string` would accept anything, which is why `CODES` above also pins the
 * union from the other side.
 */
const MINTED_BY = {
  FRONTMATTER__MISSING_REQUIRED_FIELD: 'frontmatter',
  FRONTMATTER__EMPTY_REQUIRED_FIELD: 'frontmatter',
  FRONTMATTER__FORBIDDEN_FIELD_PRESENT: 'frontmatter',
  FRONTMATTER__VALUE_NOT_ALLOWED: 'frontmatter',
  FRONTMATTER__FORMAT_MISMATCH: 'frontmatter',
  FRONTMATTER__PATTERN_MISMATCH: 'frontmatter',
  FRONTMATTER__VALUE_TOO_SHORT: 'frontmatter',
  FRONTMATTER__VALUE_TOO_LONG: 'frontmatter',
  FRONTMATTER__TOO_FEW_ITEMS: 'frontmatter',
  FRONTMATTER__TOO_MANY_ITEMS: 'frontmatter',
  FRONTMATTER__ITEM_TOO_LONG: 'frontmatter',
  FRONTMATTER__CONSTRAINT_SHAPE_MISMATCH: 'frontmatter',
  FRONTMATTER__UNKNOWN_KEY_FORBIDDEN: 'frontmatter',
  FRONTMATTER__FRONTMATTER_FORBIDDEN: 'frontmatter',
  FRONTMATTER__FRONTMATTER_UNPARSEABLE: 'frontmatter',
  FRONTMATTER__EXACTLY_ONE_OF_NONE_PRESENT: 'frontmatter',
  FRONTMATTER__EXACTLY_ONE_OF_MULTIPLE_PRESENT: 'frontmatter',
  FRONTMATTER__ANY_OF_UNSATISFIED: 'frontmatter',
  FRONTMATTER__ALL_OF_UNSATISFIED: 'frontmatter',
  BODY_STRUCTURE__LEVEL_TOO_DEEP: 'body-structure',
  BODY_STRUCTURE__HEADING_UNDEFINED: 'body-structure',
  BODY_STRUCTURE__BLOCK_KIND_NOT_ALLOWED: 'body-structure',
  BODY_STRUCTURE__HEADING_MISSING: 'body-structure',
  BODY_STRUCTURE__HEADING_OUT_OF_ORDER: 'body-structure',
  BODY_STRUCTURE__HEADING_REPEATED: 'body-structure',
  BODY_STRUCTURE__ENUMERATION_BELOW_MINIMUM: 'body-structure',
  BODY_STRUCTURE__ENUMERATION_ABOVE_MAXIMUM: 'body-structure',
} as const satisfies Record<DeclaredViolationCode, string>;

/** The config key of the Module that mints one code. */
function mintedBy(code: DeclaredViolationCode): string {
  return MINTED_BY[code];
}

/** The prefix a Module's codes carry: its config key, upper-cased, `-` read as `_`, then `__`. */
function prefixOf(key: string): string {
  return `${key.toUpperCase().replaceAll('-', '_')}__`;
}

describe('the violation codes derived from the declared Module set', () => {
  describe('success cases', () => {
    it('names a declared Module as the minter of every code', () => {
      // ARRANGE
      const declared = MODULE_SET.map((module) => module.key);
      // ACT
      const strangers = CODES.filter((code) => !declared.includes(mintedBy(code)));
      // ASSERT
      expect(strangers).toEqual([]);
    });

    it('prefixes every code with the key of the Module that mints it', () => {
      // ARRANGE
      const expected: string[] = [];
      // ACT
      const misprefixed = CODES.filter((code) => !code.startsWith(prefixOf(mintedBy(code))));
      // ASSERT
      expect(misprefixed).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('reads a bare outcome as no Module prefix at all', () => {
      // The pre-prefix spelling of a frontmatter code: it names no Module, which
      // is exactly what the grammar exists to rule out.
      // ARRANGE
      const bare = 'MISSING_REQUIRED_FIELD';
      // ACT
      const prefixed = MODULE_SET.some((module) => bare.startsWith(prefixOf(module.key)));
      // ASSERT
      expect(prefixed).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('gives every declared Module its own prefix, so no two can mint the same code', () => {
      // ARRANGE
      const prefixes = MODULE_SET.map((module) => prefixOf(module.key));
      // ACT
      const distinct = new Set(prefixes).size;
      // ASSERT
      expect(distinct).toBe(prefixes.length);
    });
  });
});
