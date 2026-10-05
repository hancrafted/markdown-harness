/**
 * What a `body-structure` candidate Rule asks of a path, as `query` answers it.
 *
 * This Module's own requirement shape (ARCH-008). The response contract holds
 * a claim generic over its requirements, and `cli` unions this shape with every
 * other declared Module's.
 */

import type { HeadingRequirement, VocabularyRequirement } from '../check/violation.types.ts';

/**
 * What one `body-structure` candidate Rule asks of a path, copied verbatim
 * from the Rule, a key it never wrote staying omitted.
 *
 * `types` is here because `--query` cannot know a file's `type` before the file
 * exists: a block carrying `types` applies only when the file's `type` is one of
 * them, and a block without applies to every type.
 */
export interface BodyStructureRequirements {
  /** The frontmatter `type` values this Rule needs, as written. */
  types?: readonly string[];
  /** The deepest heading level permitted, as written. */
  maxLevel?: number;
  /** `forbid` closes the spine, `allow` is the open spine written out; echoed as written. */
  undefinedHeadings?: 'allow' | 'forbid';
  /** The Rule's heading vocabulary, verbatim: the exact titles each named level may take. */
  vocabulary?: readonly VocabularyRequirement[];
  /** The Rule's spine, verbatim, each `intent` and `mayHold` included. */
  headings?: readonly HeadingRequirement[];
}
