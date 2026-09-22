// The two-sided guard over a selector translation, and the tier it reads.
//
// A selector rewritten from one grammar into another can be checked two ways,
// and only one of them works. Comparing what the two grammars select ACROSS A
// REAL CORPUS asks the tree whether the translation held — and a tree of real
// files can only ever say where a selector DOES reach. Every widening the
// migration note warned about is invisible to it, because the extra files a
// widened selector would claim do not exist yet.
//
// The other half asks about paths that do not exist at all. A WITNESS CASE is a
// path with no document behind it, plus the answer the steering command must
// give for it — which is how a selector is pinned by where it does NOT reach,
// something no arrangement of real files can express. Measured on the
// prototype: corpus comparisons caught ONE of six planted wrong translations,
// witness comparisons caught SIX of six.
//
// Both halves are frozen from the grammar being migrated FROM, so neither can
// be satisfied by running the new code and writing down what it said. Where the
// migration knowingly changed an answer, the witness says so by naming the
// translation unit that decided it, rather than quietly agreeing.

import { tierRoot } from './case-corpus.ts';
import { frozenAttributions, frozenWitnesses } from './lib/translation/frozen-answers.impure.ts';
import type { FrozenAttribution, FrozenWitness } from './lib/translation/translation.types.ts';
import { tierNamed } from './tier-record.ts';

export type { FrozenAttribution, FrozenWitness } from './lib/translation/translation.types.ts';

/** The tier root, which is the synthetic repo root every frozen path is relative to. */
export function translationTierRoot(): string {
  return tierRoot(tierNamed('frontmatter').name);
}

/** Every corpus file's frozen winning rule — the half a real tree can express. */
export function corpusComparisons(): readonly FrozenAttribution[] {
  return frozenAttributions(translationTierRoot());
}

/** Every witness case — the half a real tree cannot express. */
export function witnessComparisons(): readonly FrozenWitness[] {
  return frozenWitnesses(translationTierRoot());
}
