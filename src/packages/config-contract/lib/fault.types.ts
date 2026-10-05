/**
 * The Core's catalog of config faults, and the one shape a fault takes.
 *
 * It sits in the CONFIG contract rather than the response contract, and that is
 * a repair rather than a preference. The port below names `SectionValidation`,
 * which names a fault, so leaving the fault type in `response-contract` would
 * make the port depend on the wire format. `response-contract/index.ts`
 * re-exports both declarations, so every existing importer keeps working and
 * the graph runs one way.
 *
 * MODULE-FREE. This catalog holds the codes the loader raises and the codes
 * every Module's grammar shares — a rule list, a rule id, an intent, a
 * selector. A code only one Module's grammar can earn belongs to that Module's
 * Package, which extends this union with its own members; `cli` derives the
 * whole catalog from the declared Module set. Every code keeps the `CONFIG_`
 * prefix wherever it is declared: a fault's `location` already names the
 * section, and retrofitting the Module-prefixed grammar onto config faults is
 * a separate decision (#110).
 *
 * A config fault is result content rather than a throw (§4.5). A program whose
 * config errors arrive as stack traces has two output formats, and only one of
 * them is a contract.
 */

/**
 * The Core's config faults (§3.5): the ones any Module's section can earn.
 *
 * A union of string literals rather than an `enum`: `enum` is the one
 * TypeScript construct with no type-erasure, so it emits runtime code Node
 * cannot strip. The entry path is executed by Node directly, which makes an
 * `enum` anywhere on it a startup failure rather than a style choice.
 *
 * Every member carries the `CONFIG_` prefix because a `code` is read in logs
 * and transcripts far from the envelope that scoped it — a bare `INVALID_VALUE`
 * beside a Module's violation code would leave the reader guessing which file
 * to open.
 *
 * The first four name the file, the rest name a key inside it: the same split
 * HTTP draws between "no such thing", "cannot serve it", "malformed", and
 * "well-formed but wrong".
 */
export type ConfigFaultCode =
  /** Nothing exists at the config path. */
  | 'CONFIG_NOT_FOUND'
  /** Something is there but cannot be read as a file (permissions, a directory). */
  | 'CONFIG_UNREADABLE'
  /** The bytes are not valid YAML, or they parse to something other than a mapping. */
  | 'CONFIG_NOT_YAML'
  /**
   * A mapping in which no declared Module's key appears at all — a config that
   * parses and governs nothing.
   *
   * Reported by the LOADER against the config file, because only the loader
   * knows which Modules were declared. It used to be the Module's answer: an
   * absent section earned `CONFIG_EMPTY_RULE_LIST` at its `rules` key from the
   * one Module that existed. That answer could not survive a second
   * Module — each would have raised it for the other's config — so the question
   * moved up to the only place that can answer it once.
   *
   * A typo'd section name reaches this code beside `CONFIG_UNRECOGNISED_KEY`:
   * the misspelling is a key nobody claims, and the absence it leaves behind is
   * a config governing nothing. Both are reported, because a config fails whole.
   */
  | 'CONFIG_NO_MODULE_SECTION'
  /**
   * A key no declared Module claims, or a key a Module's own vocabulary does not
   * define.
   *
   * REDEFINED at the top level, where it used to mean "a key the config language
   * does not define". The config language no longer has a top level of its own:
   * the recognised key set is computed from the declared Module set, so the same
   * key is recognised or not depending on what the tool ships. Below the top
   * level it is unchanged — the Module owning that section decides.
   */
  | 'CONFIG_UNRECOGNISED_KEY'
  /** A defined key holding a value outside its type (`presence: maybe`). */
  | 'CONFIG_INVALID_VALUE'
  /**
   * `rules: []` — a section naming a Module and governing nothing.
   *
   * NARROWED: it used to cover an absent section too. The loader
   * now answers first for a config no declared Module's key appears in, and a
   * Module's `validateSection` is never called for a key that was never written,
   * so the only way to reach this code is to write the empty list.
   */
  | 'CONFIG_EMPTY_RULE_LIST'
  /** Two rules share a `ruleId`. */
  | 'CONFIG_DUPLICATE_RULE_ID'
  /**
   * A rule, or one of its exclusions, carrying neither selector axis.
   *
   * Redefined rather than respelled. It used to mean "neither `path` nor
   * `fileName`" — two keys exclusive of one another, where carrying neither was
   * one mistake and carrying both was the other. A selector is now `folders:`
   * and `fileNames:`, which INTERSECT, so carrying both is how an exact path is
   * spelled and only carrying neither is left to report. That is also why
   * `CONFIG_SELECTOR_AMBIGUOUS` was retired rather than renamed: two keys that
   * are not exclusive of one another cannot be ambiguous.
   */
  | 'CONFIG_SELECTOR_MISSING'
  /** A rule with no `intent`. */
  | 'CONFIG_MISSING_RULE_INTENT'
  /** Any `intent` key written and empty. */
  | 'CONFIG_EMPTY_INTENT'
  /** A constraint object stating nothing. */
  | 'CONFIG_EMPTY_CONSTRAINT';

/**
 * One fault: which constraint failed, and where in the config to look.
 *
 * Generic in its code so a Module can type a fault it raises against its own
 * catalog — the Core's codes plus its own — while the loader, which gathers
 * every Module's faults, holds the union `cli` derives. The default is the
 * Core's catalog, which is all a fault raised outside any Module can carry.
 */
export interface ConfigFault<TCode extends string = ConfigFaultCode> {
  /** From the Core's catalog or the raising Module's own. */
  code: TCode;
  /** The config's own notation: the section key, then the path inside it. */
  location: string;
}
