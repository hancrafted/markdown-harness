/**
 * The port a Module declares through, and what a load hands back.
 *
 * There is no whole-file config type here and there will not be one. With a
 * dynamic Module set, an interface over the whole file can only be widened with
 * an index signature or made generic over a Module tuple, and both describe a
 * consumer this architecture does not have. The honest whole-file type is the
 * YAML mapping before any key has been recognised, and it lives in the loader.
 *
 * So a validated section is reachable only through the descriptor that produced
 * it: not a record keyed by string, but a lookup whose key IS the descriptor, so
 * a section comes back under the type its own validation earned.
 */

import type { ConfigFault } from './fault.types.ts';

/**
 * What validating one Module's section hands back.
 *
 * The same shape every loading stage uses: the value alongside its faults,
 * absent whenever any fault was found. A config fails whole (§3.5), so the
 * caller concatenates rather than stopping at the first thing wrong.
 */
export interface SectionValidation<TSection> {
  /**
   * The section, typed, absent whenever a fault was found.
   *
   * Present means the value passed the Module's own narrowing, which is what
   * lets the loader ASSEMBLE a load result rather than assert one into
   * existence. A caller reading this is reading a type that was earned.
   */
  section?: TSection;

  /** Every fault the section carries, in reporting order; empty when it carries none. */
  faults: readonly ConfigFault[];
}

/**
 * How a Module reaches the Core: one top-level key, the grammar of what may sit
 * under it, and one answerer per read verb.
 *
 * SIX MEMBERS, deliberately. `key` names the config section, `validateSection`
 * earns its typed value, and the four verbs answer the work a Module does.
 * Only `validateSection` carries `TSection`, and only in return position. An
 * earlier design gave a member a validated section as an ARGUMENT, which put
 * `TSection` in parameter position and bought a variance hole: method syntax
 * made the descriptor bivariant, so a descriptor widened into a
 * `ModuleDescriptor<unknown>` could accept another Module's section with
 * nothing to say about it.
 *
 * A verb instead receives `LoadedConfig` and closes over its own descriptor.
 * `sectionFor` then returns the section under that descriptor identity, so the
 * Module holds the right type without a parameter-position `TSection`. A
 * descriptor over one Module's section therefore widens to
 * `ModuleDescriptor<unknown>` soundly, and the declared set can be iterated
 * without reopening the hole. This Package cannot name a section type to
 * illustrate it, which is the point: a section type belongs to its Module
 * (ARCH-008 §1.4) and nothing here may reach for one.
 *
 * `validateSection` is written in METHOD syntax. Under `strictFunctionTypes`
 * method syntax is bivariant in its parameters and property syntax is
 * contravariant — but the one parameter here is `unknown`, the top type, so the
 * two are indistinguishable for this signature and no variance rides on the
 * choice. Method syntax is what the ticket fixed, and it reads as what it is: a
 * Module answering a question rather than a Module carrying a callback.
 */
export interface ModuleDescriptor<
  TSection = unknown,
  TQuery = unknown,
  TAudit = unknown,
  TAssess = unknown,
  TCheck = unknown,
> {
  /**
   * The Module's one top-level config key.
   *
   * The recognised top-level key set is computed from the declared Module set
   * and nowhere else, so this string is the whole of what the config language
   * knows about this Module's existence. Two descriptors claiming one key is a
   * COMPOSITION error rather than a config error — the Operator wrote nothing
   * wrong — so it is never a `ConfigFaultCode`; `cli` holds it.
   */
  key: string;

  /**
   * Every fault the raw value under `key` carries, and the value itself when it
   * carries none.
   *
   * Called only when the key was WRITTEN. An absent key is answered by the
   * loader — it is the only place that knows the whole declared Module set — so
   * a Module never has to describe a config it was not named in.
   *
   * @param raw The value written under this Module's key, exactly as parsed.
   */
  validateSection(raw: unknown): SectionValidation<TSection>;

  /** Answer what this Module asks of one path before that path exists. */
  query(path: string, config: LoadedConfig): TQuery;

  /** Tally how this Module's declared rules fared across one corpus. */
  audit(files: readonly string[], config: LoadedConfig): TAudit;

  /** Assess one path at the caller-supplied instant. */
  assess(file: { root: string; path: string }, now: string, config: LoadedConfig): TAssess;

  /** Check this Module's governed files across one corpus. */
  check(root: string, files: readonly string[], config: LoadedConfig): TCheck;
}

/**
 * A config that can be trusted, and the one way to read a section out of it.
 *
 * `sectionFor` is a lookup keyed by descriptor IDENTITY rather than by key
 * string, which is what makes a cross-wired section unrepresentable: a Module
 * holding only its own descriptor can only ever reach its own section.
 */
export interface LoadedConfig {
  /**
   * This Module's validated section, or `undefined` when its key was not written.
   *
   * `undefined` is reachable whenever a SECOND Module's key carries the config
   * on its own — the loader rejects a config no declared Module's key appears
   * in, so with one Module it cannot arise, and with two it is ordinary. An
   * entry point handed `undefined` governs nothing; it is not an error.
   *
   * @param module The caller's own descriptor — the same object the Module set holds.
   */
  sectionFor<TSection>(module: ModuleDescriptor<TSection>): TSection | undefined;
}
