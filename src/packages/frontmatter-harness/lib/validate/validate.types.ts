/**
 * What validating the `frontmatter:` section hands back.
 *
 * The same shape every loading stage already uses: the value alongside the
 * faults, and absent whenever any fault was found. A config fails whole (§3.5),
 * so the caller concatenates rather than stopping at the first thing wrong.
 */

import type { FrontmatterConfig } from '../../../config-contract/index.ts';
import type { ConfigFault } from '../../../response-contract/index.ts';

/** The outcome of validating the `frontmatter:` section. */
export interface SectionValidation {
  /**
   * The section, typed, and absent whenever any fault was found.
   *
   * Present means the value passed the narrowing in `./section-narrowing.pure`,
   * which is what lets the loader ASSEMBLE a config rather than assert one into
   * existence. A caller reading this key is reading a type that was earned.
   */
  section?: FrontmatterConfig;

  /** Every fault the section carries, in reporting order; empty when it carries none. */
  faults: readonly ConfigFault[];
}
