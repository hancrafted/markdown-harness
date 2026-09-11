/**
 * The `indexes:` section — what a directory publishes, and where its own
 * description is read from.
 *
 * PROTOTYPE. Throwaway on day one; the open questions are recorded in
 * `docs/workshop/prototype/index-generator/findings.md`. Settled parts come from
 * issue #92 (the config shape) and issue #107 (the marker shape).
 *
 * THE FIRST MODULE WITH NO `rules:` KEY, and that is the whole shape of it.
 * `rules:` is a list in the `frontmatter:` Module for one stated reason — "a
 * list rather than a mapping: YAML mappings have no guaranteed order, and
 * first-match needs one". Two rulings delete first-match from here: every
 * directory is explicit, and no directory may be claimed twice. Each is
 * therefore claimed exactly once by name, nothing resolves, and config order
 * has no consumer at all — not resolution, and not output either, because the
 * generated list reuses `inTreeOrder` rather than config order. A list whose
 * order is meaningless sitting beside a list where order is everything is a
 * trap for the next reader, so this is a mapping.
 *
 * The duplicate-directory error is UNREPRESENTABLE rather than validated:
 * `yaml@2.9.0` throws `Map keys must be unique` with a line and column before
 * the harness ever loads. Same trade `config.types.ts` takes for its two
 * exclusivity rules.
 */

import type { Glob } from './glob.types';

/**
 * Everything the `indexes-harness` module reads.
 *
 * One Module-wide key and one mapping, and the Module-wide key is a SCALAR
 * rather than a block. A scalar has no parts, so a per-directory override
 * replaces it whole by construction and there are no merge semantics to design
 * — which is what makes "replace whole" true here by construction rather than
 * by mechanism.
 */
export interface IndexesConfig {
  /**
   * Where a folder's OWN description is read from, for the parent that lists it.
   *
   * Defaults to `index.md`, because the primary case is a page collection
   * rather than an implementation module. The key only ever READS: where the
   * generated region is WRITTEN is hard-wired to `index.md` and takes no key at
   * all — `index.md` is the progressive-disclosure container, `AGENTS.md` is
   * agent instruction, and they are two containers with two jobs.
   *
   * THERE IS NO `requireDescription:` KEY, deliberately. A missing description
   * degrades an entry to name-only and this Module reports nothing about it.
   * Steering `description` stays in the `frontmatter:` Module, where
   * `presence`, `minLength`, `maxLength` and `intent` already ship — a boolean
   * here would be a weaker duplicate of shipped capability and would put one
   * field under two Modules at once.
   */
  descriptionSource?: string;

  /**
   * Which directories publish an index, keyed by directory path. REQUIRED.
   *
   * A bare key means "publish here, with every default", and parses to `null`.
   * An empty mapping is a config error, not an inert Module — the same
   * judgement `rules: []` already gets.
   *
   * Every directory is named explicitly. There is no glob shorthand and no
   * implicit definition anywhere in this Module, which is what makes a folder
   * omitted here silently absent from its parent — the cost the adopting skill
   * exists to stand between an adopter and.
   */
  directories: Record<DirectoryPath, DirectorySettings | null>;
}

/**
 * One directory that publishes, as a repo-root-relative path.
 *
 * THE TRAILING SLASH IS REQUIRED, and it is load-bearing rather than
 * decoration. YAML's key uniqueness is TEXTUAL: `docs/research/` and
 * `docs/research` parse as two keys naming one directory, which would leak
 * straight through the protection the mapping was chosen for. Requiring one
 * spelling is what makes textual uniqueness become semantic uniqueness, at the
 * cost of one string test.
 *
 * The repo root is `./`. The slash-free spelling would force `'':` — a quoted
 * empty string, because `childPath` returns `''` at the root — and an OKF
 * bundle root is a real case, so the root has to be spellable.
 */
export type DirectoryPath = string;

/**
 * What one declared directory may say about itself, beyond publishing.
 *
 * Both keys are optional, so `null` and `{}` mean the same thing. Flat scalars
 * rather than a named block: these are independent settings rather than one
 * coherent prompt, so a block would buy the restate-everything cost of
 * replace-whole with none of its benefit.
 */
export interface DirectorySettings {
  /**
   * This directory's own `descriptionSource`, replacing the Module-wide value.
   *
   * PROTOTYPE NOTE — the resolution order is the one genuinely undecided thing
   * in this type. Issue #92's two worked examples require DIFFERENT rules if
   * each is read alone: `docs/reference/` is described by its own declared
   * `labels.md`, while `docs/skills/anonymous/` — which declares nothing — is
   * described by its PARENT's `SKILL.md`. The only rule reproducing both is
   * "the nearest declared value walking up from the directory being described,
   * inclusive, else the Module-wide default", and that is what this prototype
   * implements. It is inheritance, which sits uneasily beside "no implicit
   * definition, I would even say never". Recorded in the findings, not settled.
   */
  descriptionSource?: string;

  /**
   * Paths this directory's index does NOT list, as globs.
   *
   * Root-relative, the same meaning `Glob` carries in the `frontmatter:`
   * Module. A glob meaning different things in different sections is the same
   * trap as a meaningless-order list, and the contract already carries one
   * deliberate two-meanings collision — one is a known cost, two is a pattern.
   *
   * Where this key is in effect the region carries ONE trailing disclosure
   * comment: a fact, not a list. No names and no count, so it stays narrower
   * than the trailing section and the count line that were both rejected, and
   * it is deterministic from config alone so it holds B4.
   */
  excludeFiles?: Glob[];
}
