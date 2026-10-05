// `npm run conformance -- <path>`: run one spec folder the way a human reads it.
//
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
import { folderRequestOf } from './lib/spec-folder/folder-argument.pure.ts';
import type { RunnableUnit } from './lib/spec-folder/folder-argument.types.ts';
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

const request = folderRequestOf(
  process.argv[2],
  CONFORMANCE_TIERS.map((tier) => ({ name: tier.name, unit: UNIT_OF[tier.caseKind] })),
);

function compareAll(tier: string, folders: readonly string[]): number {
  let disagreeing = 0;
  for (const folder of folders) {
    const report = compareSpecFolder(specFolderPath(tier, folder), `${tier}/docs/${folder}`);
    process.stdout.write(renderReport(report));
    if (!report.agrees) disagreeing++;
  }
  if (folders.length > 1)
    process.stdout.write(`\n${folders.length - disagreeing} of ${folders.length} spec folders agree\n`);
  return disagreeing === 0 ? 0 : 1;
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
  return disagreeing === 0 ? 0 : 1;
}

switch (request.kind) {
  case 'refused':
    process.stderr.write(`conformance: ${request.reason}\n`);
    process.exitCode = 2;
    break;
  case 'spec-folder':
    process.exitCode = specFoldersIn(request.tier).includes(request.folder)
      ? compareAll(request.tier, [request.folder])
      : (process.stderr.write(`conformance: no spec folder ${request.folder} in the ${request.tier} tier\n`), 2);
    break;
  case 'directory': {
    const folder = request.path.startsWith('/') ? request.path : hostPath(REPOSITORY, request.path);
    if (readTextIn(folder, ADOPTER_CONFIG_FILE).kind !== 'text') {
      process.stderr.write(
        `conformance: ${request.path} is not under a Conformance tier and holds no ${ADOPTER_CONFIG_FILE}\n`,
      );
      process.exitCode = 2;
      break;
    }
    const report = compareSpecFolder(folder, request.path);
    process.stdout.write(renderReport(report));
    process.exitCode = report.agrees ? 0 : 1;
    break;
  }
  case 'case-directory':
    process.exitCode = rejectedConfigCases(tierNamed(request.tier)).includes(request.caseName)
      ? compareCases(request.tier, [request.caseName])
      : (process.stderr.write(`conformance: no case directory ${request.caseName} in the ${request.tier} tier\n`), 2);
    break;
  case 'case-tier':
    process.exitCode = compareCases(request.tier, rejectedConfigCases(tierNamed(request.tier)));
    break;
  case 'spec-tier':
    process.exitCode = compareAll(request.tier, specFoldersIn(request.tier));
    break;
  case 'tier-runner': {
    const runner = `src/packages/conformance/tests/${runnerFileFor(request.tier)}`;
    process.stdout.write(`the ${request.tier} tier has no spec folders; running its runner, ${runner}\n`);
    const run = runEntry(hostPath(REPOSITORY, 'node_modules', 'vitest', 'vitest.mjs'), ['run', runner], REPOSITORY);
    process.stdout.write(run.stdout);
    process.stderr.write(run.stderr);
    process.exitCode = run.code ?? 1;
    break;
  }
}
