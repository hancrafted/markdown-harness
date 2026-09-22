/** Coverage gaps and frozen values outside the declaration, answered as one pair. */
export function coverageAndClosure(
  declared: readonly string[],
  reached: readonly string[],
  frozen: readonly string[],
): { unreached: readonly string[]; undeclared: readonly string[] } {
  const reachedSet = new Set(reached);
  const declaredSet = new Set(declared);

  return {
    unreached: declared.filter((value) => !reachedSet.has(value)),
    undeclared: [...new Set(frozen.filter((value) => !declaredSet.has(value)))],
  };
}
