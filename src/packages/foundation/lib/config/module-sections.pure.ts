/**
 * Validate each declared Module's own section, and hand the results back under
 * the descriptors that produced them.
 *
 * Its own file rather than a step inside the loader, because it is where the one
 * unmechanised promise of the whole arrangement lives: a descriptor is shown the
 * value written under ITS OWN key and nothing else (ARCH-008 §1.5). The type
 * system was measured unable to catch a cross-wired section, so the guard is
 * this one call site plus the loader's suite — and a call site is only a guard
 * while it is small enough to read.
 *
 * Deterministic: the same document and the same Module set yield the same
 * answer, so it carries the `pure` classifier. Nothing here decides which faults
 * a config earns beyond the ones its Modules report; the file-level codes are
 * the loader's.
 */

import type { ConfigFault, LoadedConfig, ModuleDescriptor } from '../../../config-contract/index.ts';
import type { ConfigMapping, SectionOutcome } from './config-load.types.ts';

/**
 * Ask every declared Module about its own key, skipping any key not written.
 *
 * An absent key is NOT passed through to the Module. A Module answering its own
 * absence was only sound while one Module existed — with two, each would report
 * the other's config as governing nothing — so the absent case is answered once,
 * by the loader, against the whole declared set.
 *
 * @param document The parsed config mapping.
 * @param modules The declared Module set, exactly as the composing Package wrote it.
 */
export function validateDeclaredSections(
  document: ConfigMapping,
  modules: readonly ModuleDescriptor<unknown>[],
): SectionOutcome {
  const sections = new Map<ModuleDescriptor<unknown>, unknown>();
  const faults: ConfigFault[] = [];

  for (const module of modules) {
    if (!Object.hasOwn(document, module.key)) continue;
    const validated = module.validateSection(document[module.key]);
    faults.push(...validated.faults);
    if (validated.section !== undefined) sections.set(module, validated.section);
  }

  return { sections, faults };
}

/**
 * The config a caller reads sections out of.
 *
 * Keyed by descriptor IDENTITY rather than by key string, which is what makes a
 * cross-wired read unrepresentable at the call site: a Module holding only its
 * own descriptor has no spelling for anyone else's section.
 *
 * @param sections Exactly what `validateDeclaredSections` built, and nothing assembled by hand.
 */
export function configOf(sections: ReadonlyMap<ModuleDescriptor<unknown>, unknown>): LoadedConfig {
  return {
    sectionFor<TSection>(module: ModuleDescriptor<TSection>): TSection | undefined {
      // THE ONE TYPE ASSERTION IN THIS ARRANGEMENT, and its premise is the loop
      // above: the only writer of this map stores, under a descriptor, the
      // `section` that same descriptor returned. `Map` erases that pairing — its
      // value type is the union across every Module — so narrowing back to this
      // descriptor's `TSection` is the one thing the type system cannot recover,
      // and the one place a cast is spent.
      return sections.get(module) as TSection | undefined;
    },
  };
}
