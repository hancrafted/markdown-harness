/** Whether a runner derives its tier record from its own module URL. */
export function readsOwnTier(source: string): boolean {
  const code = source
    .replace(/\/\*[\s\S]*?\*\//gu, '')
    .replace(/\/\/.*$/gmu, '')
    .replace(/'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"/gu, "''");
  const derivesOwnRecord = /\bconst\s+TIER\s*=\s*tierForRunner\s*\(\s*import\.meta\.url\s*\)/u.test(code);
  const declaresCount = /\bconst\s+declaredCases\s*=\s*TIER\.caseCount\b/u.test(code);
  const assertsCount = /\bexpect\s*\(\s*enumerated\s*\)\s*\.toBe\s*\(\s*declaredCases\s*\)/u.test(code);

  return derivesOwnRecord && declaresCount && assertsCount;
}
