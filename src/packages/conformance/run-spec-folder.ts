// `npm run conformance`: run every Conformance tier, which is what the gate runs,
// or `npm run conformance -- --path <path> [<path> ...]`: run only the listed
// paths, the way a human reads one. A bare path still works as one `--path`.
//
// Exits with the worst code across everything run: 0 all agree, 1 one
// disagrees, 2 a path refused.
//
// For one folder:
// Prints the folder's `# Spec:` line, each case's stated verdict against what
// `mh check` reported, the governed count, and every frozen file — the diff
// when one disagrees — then exits 1 on any disagreement. It runs the same
// comparison each spec-folder tier runner runs, `./spec-folder.ts`, so the
// script and the suite cannot disagree about a folder. A tier root runs every
// spec folder in it. A `rejected-config` case directory runs the same way
// through `./rejected-config-case.ts`, the comparison its tier runner calls:
// the opening comment of its config, then each frozen file against what `mh`
// prints inside it. The root of a tier with neither runs that tier's runner;
// a directory outside every tier that holds the adopter's config — a
// scratch copy of a folder, say — is compared as a spec folder of its own;
// anything else is refused with the reason.
//
// Judges the LAST BUILD of `mh` under `dist/` (trap 9 in
// docs/agents/verification.md), so build first. Run from the repository root,
// which is where `npm run` starts it.

import { hostPath } from '../foundation/host-path.ts';
import { readTextIn } from '../foundation/read-text.ts';
import { runEntry } from '../foundation/run-entry.ts';
import { conformanceRoot } from './case-corpus.ts';
import { conformanceArgumentsOf, folderRequestOf } from './lib/spec-folder/folder-argument.pure.ts';
import type { FolderRequest, RunnableUnit } from './lib/spec-folder/folder-argument.types.ts';
import { runnerFileFor } from './lib/tier/tier-name.pure.ts';
import {
  compareRejectedCase,
  rejectedCasePath,
  rejectedConfigCases,
  renderRejectedCase,
} from './rejected-config-case.ts';
import { compareSpecFolder, renderReport, specFolderPath, specFoldersIn } from './spec-folder.ts';
import { ADOPTER_CONFIG_FILE, CONFORMANCE_TIERS, tierNamed } from './tier-record.ts';

const REPOSITORY = hostPath(conformanceRoot(), '..', '..');

/** What a tier's case kind makes runnable alone. */
const UNIT_OF: Record<(typeof CONFORMANCE_TIERS)[number]['caseKind'], RunnableUnit> = {
  'spec-folder': 'spec-folder',
  'rejected-config': 'case-directory',
  markdown: 'none',
};

const TIER_SHAPES = CONFORMANCE_TIERS.map((tier) => ({ name: tier.name, unit: UNIT_OF[tier.caseKind] }));

/** Exit codes, worst last: every unit agrees, one disagrees, a path was refused. */
const AGREES = 0;
const DISAGREES = 1;
const REFUSED = 2;

function compareAll(tier: string, folders: readonly string[]): number {
  let disagreeing = 0;
  for (const folder of folders) {
    const report = compareSpecFolder(specFolderPath(tier, folder), `${tier}/docs/${folder}`);
    process.stdout.write(renderReport(report));
    if (!report.agrees) disagreeing++;
  }
  if (folders.length > 1)
    process.stdout.write(`\n${folders.length - disagreeing} of ${folders.length} spec folders agree\n`);
  return disagreeing === 0 ? AGREES : DISAGREES;
}

function compareCases(tier: string, caseNames: readonly string[]): number {
  let disagreeing = 0;
  for (const caseName of caseNames) {
    const report = compareRejectedCase(rejectedCasePath(tier, caseName), `${tier}/${caseName}`);
    process.stdout.write(renderRejectedCase(report));
    if (!report.agrees) disagreeing++;
  }
  if (caseNames.length > 1)
    process.stdout.write(`\n${caseNames.length - disagreeing} of ${caseNames.length} cases agree\n`);
  return disagreeing === 0 ? AGREES : DISAGREES;
}

type RequestOf<Kind extends FolderRequest['kind']> = Extract<FolderRequest, { kind: Kind }>;

/** Write a refusal to stderr; answers the refusal exit code. */
function refuse(message: string): number {
  process.stderr.write(`conformance: ${message}\n`);
  return REFUSED;
}

function runSpecFolder(request: RequestOf<'spec-folder'>): number {
  return specFoldersIn(request.tier).includes(request.folder)
    ? compareAll(request.tier, [request.folder])
    : refuse(`no spec folder ${request.folder} in the ${request.tier} tier`);
}

function runDirectory(request: RequestOf<'directory'>): number {
  const folder = request.path.startsWith('/') ? request.path : hostPath(REPOSITORY, request.path);
  if (readTextIn(folder, ADOPTER_CONFIG_FILE).kind !== 'text')
    return refuse(`${request.path} is not under a Conformance tier and holds no ${ADOPTER_CONFIG_FILE}`);
  const report = compareSpecFolder(folder, request.path);
  process.stdout.write(renderReport(report));
  return report.agrees ? AGREES : DISAGREES;
}

function runCaseDirectory(request: RequestOf<'case-directory'>): number {
  return rejectedConfigCases(tierNamed(request.tier)).includes(request.caseName)
    ? compareCases(request.tier, [request.caseName])
    : refuse(`no case directory ${request.caseName} in the ${request.tier} tier`);
}

function runTierRunner(request: RequestOf<'tier-runner'>): number {
  const runner = `src/packages/conformance/tests/${runnerFileFor(request.tier)}`;
  process.stdout.write(`the ${request.tier} tier has no spec folders; running its runner, ${runner}\n`);
  const run = runEntry(hostPath(REPOSITORY, 'node_modules', 'vitest', 'vitest.mjs'), ['run', runner], REPOSITORY);
  process.stdout.write(run.stdout);
  process.stderr.write(run.stderr);
  return run.code ?? DISAGREES;
}

/** How each kind of request runs; every kind answers its exit code. */
const RUN_BY_KIND: { readonly [Kind in FolderRequest['kind']]: (request: RequestOf<Kind>) => number } = {
  refused: (request) => refuse(request.reason),
  'spec-folder': runSpecFolder,
  'spec-tier': (request) => compareAll(request.tier, specFoldersIn(request.tier)),
  directory: runDirectory,
  'case-directory': runCaseDirectory,
  'case-tier': (request) => compareCases(request.tier, rejectedConfigCases(tierNamed(request.tier))),
  'tier-runner': runTierRunner,
};

/** Run whatever one typed path names, printing its report; answers the exit code. */
function runPath(path: string): number {
  const request = folderRequestOf(path, TIER_SHAPES);
  return (RUN_BY_KIND[request.kind] as (request: FolderRequest) => number)(request);
}

/** Every tier, each through its root, so the gate and a human run the same thing. */
function runEveryTier(): number {
  return CONFORMANCE_TIERS.reduce((worst, tier) => {
    process.stdout.write(`\n== ${tier.name} tier\n`);
    return Math.max(worst, runPath(tier.name));
  }, AGREES);
}

const parsed = conformanceArgumentsOf(process.argv.slice(2));
switch (parsed.kind) {
  case 'refused':
    process.exitCode = refuse(parsed.reason);
    break;
  case 'every-tier':
    process.exitCode = runEveryTier();
    break;
  case 'paths':
    process.exitCode = parsed.paths.reduce((worst, path) => Math.max(worst, runPath(path)), AGREES);
    break;
}
