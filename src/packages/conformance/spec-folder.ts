// One spec folder, compared end to end: the shared half of every spec-folder
// runner and of `npm run conformance`.
//
// A spec folder is one directory directly under a tier's `docs/`, and it is a
// synthetic repo root: the adopter's config file name, a first line stating the
// spec, its Conformance cases, and the frozen output `mh` prints there —
// `expected-check.json` always, `expected-audit.json` where Rules compete, and
// `expected-query.json` where paths were asked. This module runs the compiled
// `mh` INSIDE the folder with no flag, exactly as a human does, and holds each
// answer against its frozen file byte for byte. The tier runners and the script
// both call it, so the two can never disagree about what a folder states.
//
// It judges the LAST BUILD, never the source: `toolEntry()` names `dist/`, so
// build before trusting a run (trap 9 in docs/agents/verification.md).

import { hostPath } from '../foundation/host-path.ts';
import { directoryNamesIn } from '../foundation/list-directory.ts';
import { listMarkdownFiles } from '../foundation/list-markdown-files.ts';
import { readTextIn } from '../foundation/read-text.ts';
import { runEntry } from '../foundation/run-entry.ts';
import { tierRoot } from './case-corpus.ts';
import { expectMarkersIn } from './lib/marker/marker-scan.pure.ts';
import {
  caseLinesOf,
  frozenComparison,
  renderReport,
  reportAgrees,
  specSentenceOf,
} from './lib/spec-folder/spec-folder.pure.ts';
import type { FrozenComparison, SpecFolderReport } from './lib/spec-folder/spec-folder.types.ts';
import { envelopeOf } from './lib/tool/tool-answer.pure.ts';
import { ADOPTER_CONFIG_FILE } from './tier-record.ts';
import { toolEntry } from './tool-answer.ts';

export type { CaseLine, FrozenComparison, SpecFolderReport } from './lib/spec-folder/spec-folder.types.ts';
export { renderReport };

/** The frozen `check` response every spec folder holds. */
export const EXPECTED_CHECK = 'expected-check.json';
/** The frozen `audit` response a folder holds where Rules compete for a file. */
const EXPECTED_AUDIT = 'expected-audit.json';
/** The frozen `query` responses a folder holds, keyed by the path asked. */
const EXPECTED_QUERY = 'expected-query.json';
/** The manifest that states a verbatim case's verdict, because its bytes cannot carry a marker. */
export const VERBATIM_MANIFEST = 'verbatim-cases.json';

/**
 * Every spec folder of a tier, by name, sorted.
 *
 * @param tier A spec-folder tier's directory name.
 */
export function specFoldersIn(tier: string): readonly string[] {
  const docs = hostPath(tierRoot(tier), 'docs');
  const found = directoryNamesIn(docs);
  if (found === undefined) throw new Error(`the ${tier} tier has no readable docs/ at ${docs}`);
  return found;
}

/**
 * A spec folder's host path.
 *
 * @param tier The tier's directory name.
 * @param folder The spec folder's name under `docs/`.
 */
export function specFolderPath(tier: string, folder: string): string {
  return hostPath(tierRoot(tier), 'docs', folder);
}

/** A file in the folder as text, or `undefined` when it is not there. */
function textIn(folder: string, file: string): string | undefined {
  const found = readTextIn(folder, file);
  return found.kind === 'text' ? found.text : undefined;
}

/**
 * The verdict each case states: its `expect:` marker, or the verbatim
 * manifest's entry for a case whose bytes cannot carry one.
 *
 * @param folder The spec folder's host path.
 */
export function statedVerdictsIn(folder: string): readonly { readonly path: string; readonly verdict: string }[] {
  const manifestText = textIn(folder, VERBATIM_MANIFEST);
  const manifest =
    manifestText === undefined ? {} : (JSON.parse(manifestText) as Record<string, { readonly verdict: string }>);
  const cases = listMarkdownFiles(folder);
  if (cases === undefined) throw new Error(`the spec folder ${folder} is not readable`);
  return cases.map((path) => {
    const verbatim = manifest[path];
    if (verbatim !== undefined) return { path, verdict: verbatim.verdict };
    const markers = expectMarkersIn(textIn(folder, path) ?? '');
    return { path, verdict: markers.length === 1 ? markers[0] : `MARKERS:${markers.length}` };
  });
}

/**
 * Run `mh` inside `folder` with `args` and nothing else, as a human does.
 *
 * @param folder The spec folder's host path.
 * @param args The command words after `mh`.
 */
function mhIn(
  folder: string,
  args: readonly string[],
): { readonly stdout: string; readonly stderr: string; readonly code: number | null } {
  return runEntry(toolEntry(), args, folder);
}

/** Every `query` the folder freezes, each asked afresh and held against its frozen answer. */
function queryComparisons(folder: string, frozenText: string): readonly FrozenComparison[] {
  const frozen = JSON.parse(frozenText) as Record<string, unknown>;
  return Object.entries(frozen).map(([path, answer]) => {
    const asked = mhIn(folder, ['query', path]);
    const fresh = (() => {
      try {
        return JSON.stringify(JSON.parse(asked.stdout), null, 2);
      } catch {
        return asked.stdout;
      }
    })();
    return frozenComparison(`${EXPECTED_QUERY} ${path}`, JSON.stringify(answer, null, 2), fresh);
  });
}

/** Every frozen file the folder holds, each held against a fresh run. */
function frozenComparisons(folder: string, checkStdout: string): readonly FrozenComparison[] {
  const frozen: FrozenComparison[] = [
    frozenComparison(EXPECTED_CHECK, textIn(folder, EXPECTED_CHECK) ?? '', checkStdout),
  ];
  const audit = textIn(folder, EXPECTED_AUDIT);
  if (audit !== undefined) frozen.push(frozenComparison(EXPECTED_AUDIT, audit, mhIn(folder, ['audit']).stdout));
  const query = textIn(folder, EXPECTED_QUERY);
  if (query !== undefined) frozen.push(...queryComparisons(folder, query));
  return frozen;
}

/** How many cases state a governed verdict. */
function governedStated(stated: readonly { readonly verdict: string }[]): number {
  return stated.filter((line) => line.verdict === 'PASSES' || line.verdict === 'FAILS').length;
}

/**
 * Compare one spec folder end to end.
 *
 * @param folder The spec folder's host path.
 * @param name What the report calls the folder.
 */
export function compareSpecFolder(folder: string, name: string): SpecFolderReport {
  const config = textIn(folder, ADOPTER_CONFIG_FILE);
  const check = mhIn(folder, []);
  const result = envelopeOf(check).result;
  const stated = statedVerdictsIn(folder);
  const partial = {
    folder: name,
    spec: specSentenceOf(config ?? ''),
    cases: caseLinesOf(
      stated,
      (result?.files ?? []).map((file) => file.path),
    ),
    governed: { stated: governedStated(stated), reported: result?.summary?.governedFiles },
    frozen: frozenComparisons(folder, check.stdout),
  };
  return { ...partial, agrees: reportAgrees(partial) };
}
