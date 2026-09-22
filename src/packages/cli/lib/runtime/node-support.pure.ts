/**
 * Which Node this command will answer under, and what it says when it will not.
 *
 * The window follows Node's support lines rather than a platform capability.
 * Node 24 is Active LTS, Node 25 reached end of life, and Node 26 is Current
 * before its LTS transition. Those lines are the support promise an Operator
 * can rely on; a patch floor would claim a distinction this command no longer
 * has after selectors stopped calling `node:path`'s glob matcher.
 *
 * The range deliberately changes with this decision: the public contract now
 * admits every release in the 24 line and every release from 26 onward, while
 * retaining the 25 exclusion. `package.json`, this refusal and CI are changed
 * together because an installer, command and maintainer must tell the same
 * Operator-facing story.
 */

/** `>=24` — the active LTS line. */
const LOWER_FROM = [24, 0, 0];

/** `<25` — the end-of-life line stays outside the support promise. */
const LOWER_BELOW = [25, 0, 0];

/** `>=26` — the current line and later releases. */
const UPPER_FROM = [26, 0, 0];

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
const SUPPORTED_NODE = '>=24 <25 || >=26';

/**
 * A version read as three numbers, or nothing when it does not read as one.
 *
 * A prerelease is read as its release, so `26.0.0-rc.1` gives `[26, 0, 0]`.
 * The guard decides support by release line rather than SemVer precedence, so
 * a candidate on a supported line receives the same answer as that line.
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
 * What stderr should carry when this Node is outside the declared range, and
 * nothing at all when it is inside.
 *
 * A refusal rather than a warning: a warning alongside a wrong answer is still
 * a wrong answer, and the wrong answer here is a corpus verdict an Operator
 * would act on.
 *
 * The sentence names the manifest rather than the matcher. It used to name the
 * matcher, and that reason went with the glob grammar; saying it anyway would
 * be telling an adopter something untrue about their own machine.
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
    `That range is what this release is built and tested against. Refusing is the`,
    `only answer that cannot be quietly wrong.`,
    ``,
  ].join('\n');
}
