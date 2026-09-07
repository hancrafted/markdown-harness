/**
 * Which Node this command will answer under, and what it says when it will not.
 *
 * Path matching delegates to `node:path`'s `matchesGlob`, whose behaviour is
 * fixed by the matcher library bundled with each Node release — and that
 * bundled version moves by patch, not by major line. Outside the window below,
 * the same tree in gives a different result out, which breaks tenet 3 without
 * saying so. So the declared range is the honest one rather than the tidy one,
 * and the command refuses rather than answering differently: `engines` is
 * advisory unless an adopter opted into strictness, so the manifest cannot be
 * the only place this holds.
 *
 * Which releases carry the behaviour is a registry fact, measured rather than
 * derived; issue #46 §5 records the measurement.
 */

/** `>=24.16.0` — the first Node 24 release whose bundled matcher carries it. */
const LOWER_FROM = [24, 16, 0];

/** `<25` — no Node 25 release carries it, so the lower window closes at the line. */
const LOWER_BELOW = [25, 0, 0];

/** `>=26.1.0` — the first Node 26 release that carries it; later lines inherit it. */
const UPPER_FROM = [26, 1, 0];

/**
 * The supported range, in the spelling `package.json`'s `engines.node` carries.
 *
 * Written out rather than derived from the three boundaries above, and not
 * derived from either: an adopter's installer reads the manifest, only this
 * file is compiled into the command, and a reader has to be able to hold both
 * spellings side by side. The process-boundary suite asserts that a refusal
 * carries the manifest's value verbatim, so the two cannot drift apart in
 * silence.
 */
const SUPPORTED_NODE = '>=24.16.0 <25 || >=26.1.0';

/**
 * A version read as three numbers, or nothing when it does not read as one.
 *
 * A prerelease is read as its release, so `26.1.0-rc.1` gives `[26, 1, 0]`.
 * Semver puts that below `26.1.0` and would refuse it; the only thing at stake
 * here is which matcher a release bundles, and a candidate for a release that
 * carries the behaviour carries it too.
 */
function numbered(version: string): readonly number[] | undefined {
  const read = /^(\d+)\.(\d+)\.(\d+)/.exec(version);
  if (read === null) return undefined;
  return [Number(read[1]), Number(read[2]), Number(read[3])];
}

/** Negative while `version` precedes `boundary`, zero on the same release. */
function precedes(version: readonly number[], boundary: readonly number[]): boolean {
  for (let part = 0; part < boundary.length; part += 1) {
    if (version[part] !== boundary[part]) return version[part] < boundary[part];
  }
  return false;
}

/**
 * What stderr should carry when this Node cannot be trusted to match a path,
 * and nothing at all when it can.
 *
 * A refusal rather than a warning, and before anything is read: a warning
 * alongside a wrong answer is still a wrong answer, and the wrong answer here
 * is a corpus verdict an Operator would act on.
 *
 * @param version A bare `major.minor.patch`, as `process.versions.node` reports.
 */
export function unsupportedRuntime(version: string): string | undefined {
  const found = numbered(version);
  const inLower = found !== undefined && !precedes(found, LOWER_FROM) && precedes(found, LOWER_BELOW);
  const inUpper = found !== undefined && !precedes(found, UPPER_FROM);
  if (inLower || inUpper) return undefined;

  return [
    `mh: Node ${version} is not supported — markdown-harness requires ${SUPPORTED_NODE}.`,
    ``,
    `Path matching delegates to this Node's own glob matcher, and outside that`,
    `range the same corpus reports differently. Refusing is the only answer that`,
    `cannot be quietly wrong.`,
    ``,
  ].join('\n');
}
