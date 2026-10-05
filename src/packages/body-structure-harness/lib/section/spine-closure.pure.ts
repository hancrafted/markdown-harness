/**
 * The two questions both halves of the Module ask of a Rule's
 * `undefinedHeadings` key: the check, which holds a
 * typed Rule, and config validation, which holds the YAML as written. One
 * spelling of each, so the halves cannot disagree about what closes a spine.
 */

/** The only part of a Rule these predicates read, typed or straight off the YAML. */
interface ClosureKey {
  undefinedHeadings?: unknown;
}

/**
 * Whether the Rule closes its spine: it writes `undefinedHeadings: forbid`.
 *
 * @param rule A Rule, typed or straight off the YAML.
 */
export function closesSpine(rule: ClosureKey): boolean {
  return rule.undefinedHeadings === 'forbid';
}

/**
 * Whether the Rule writes `undefinedHeadings` as anything but `allow`, the
 * default written out. A closed spine is one such value and an invalid value
 * is another, which config validation reports at the key and so must not also
 * call an empty Rule.
 *
 * @param rule A Rule, typed or straight off the YAML.
 */
export function writesClosureBeyondDefault(rule: ClosureKey): boolean {
  return 'undefinedHeadings' in rule && rule.undefinedHeadings !== 'allow';
}
