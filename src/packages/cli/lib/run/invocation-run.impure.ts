/**
 * Gather one invocation's ambient inputs and hand them to the composer.
 *
 * §184 split this file in two. What is left is the SHELL: it reads the runtime
 * version, walks the corpus, loads the config and reads the clock — the four
 * ambient inputs a command can need — and sequences them only where a real
 * dependency forces it (a config cannot be loaded through a root that could
 * not be walked; a governed file cannot be read before the corpus that names
 * it is known). It decides nothing about what those inputs MEAN: every exit
 * code, every envelope and the channel split all live in
 * `termination.pure.ts` now, behind the one call to `terminationFor` that ends
 * every branch below.
 */

import { listMarkdownFiles } from '../../../foundation/list-markdown-files.ts';
import { loadConfig } from '../../../foundation/load-config.ts';
import { normalisePath } from '../../../foundation/path-shape.ts';
import { assessPath } from '../../../frontmatter-harness/assess.ts';
import { auditRules } from '../../../frontmatter-harness/audit.ts';
import { checkCorpus } from '../../../frontmatter-harness/check.ts';
import { frontmatterModule } from '../../../frontmatter-harness/module.ts';
import { queryPath } from '../../../frontmatter-harness/query.ts';
import { MODULE_SET } from '../../module-set.ts';
import type { Invocation } from '../argv/argv.types.ts';
import { corpusVerdict } from './corpus-verdict.pure.ts';
import { hostInstant } from './host-instant.impure.ts';
import { pathGovernance } from './path-governance.pure.ts';
import { resolvedInstant, route, terminationFor, withCorpusGuard } from './termination.pure.ts';
import type {
  AssessGathered,
  AuditGathered,
  CheckGathered,
  ConfigOutcome,
  Gathered,
  QueryGathered,
} from './termination.types.ts';

type LoadedConfiguration = NonNullable<ReturnType<typeof loadConfig>['config']>;

/**
 * Load the config once.
 *
 * Checks `load.config === undefined` in this single site; every reporting command
 * routes through here to acquire either valid config sections or rejection faults.
 */
function gatherConfig(config: string): ConfigOutcome<LoadedConfiguration> {
  const load = loadConfig(config, MODULE_SET);
  if (load.config === undefined) {
    return { kind: 'rejected', faults: load.faults };
  }
  return { kind: 'answered', result: load.config };
}

/**
 * What the config asks of one path, before anything exists there.
 *
 * Every declared Module is asked, and each answer is named by the key on ITS
 * OWN DESCRIPTOR rather than by a string written here.
 */
function gatherQuery({ path, config }: Invocation): QueryGathered {
  const cfg = gatherConfig(config);
  if (cfg.kind === 'rejected') return { kind: 'query', path, config, outcome: cfg };

  const section = cfg.result.sectionFor(frontmatterModule);
  const answers = [{ module: frontmatterModule.key, claim: queryPath(path, section) }];
  const result = pathGovernance(normalisePath(path), answers);
  return { kind: 'query', path, config, outcome: { kind: 'answered', result } };
}

/**
 * How every rule fared across the corpus.
 *
 * The corpus is enumerated BEFORE the config is read via `withCorpusGuard`.
 */
function gatherAudit({ root, config }: Invocation): AuditGathered {
  const outcome = withCorpusGuard(listMarkdownFiles(root), (files) => {
    const cfg = gatherConfig(config);
    if (cfg.kind === 'rejected') return cfg;
    const section = cfg.result.sectionFor(frontmatterModule);
    return { kind: 'answered' as const, result: auditRules(files, section) };
  });
  return { kind: 'audit', root, config, outcome };
}

/**
 * What one file is worth believing, at one instant.
 *
 * The clock is read UNCONDITIONALLY here, whether or not `--now` was given:
 * `resolvedInstant` is the rule that decides which one counts, and it can only
 * be a plain pure ternary if both its inputs already exist by the time it
 * runs. Reading it lazily would put the rule back behind a conditional in this
 * file instead of in the composer.
 */
function gatherAssess({ path, config, now, root }: Invocation): AssessGathered {
  const instant = resolvedInstant(now, hostInstant());
  const cfg = gatherConfig(config);
  if (cfg.kind === 'rejected') return { kind: 'assess', path, now: instant, config, outcome: cfg };

  // `root` is always the default here: `--root` beside `--assess` is refused as
  // conflicting input, so this is the current directory by construction.
  const result = assessPath({ root, path }, cfg.result.sectionFor(frontmatterModule), instant);
  return { kind: 'assess', path, now: instant, config, outcome: { kind: 'answered', result } };
}

/**
 * Every governed file's violations, across one corpus.
 *
 * ORDERING CONTRACT: Enumerated BEFORE the config is read via `withCorpusGuard`.
 * A `--root` that cannot be walked is part of the invocation and must be answered
 * as a usage error — nothing at all on stdout. `withCorpusGuard` enforces that
 * `gatherConfig` is never evaluated when the corpus root is invalid.
 */
function gatherCheck({ root, config }: Invocation): CheckGathered {
  const outcome = withCorpusGuard(listMarkdownFiles(root), (files) => {
    const cfg = gatherConfig(config);
    if (cfg.kind === 'rejected') return cfg;

    const checked = checkCorpus(root, files, cfg.result.sectionFor(frontmatterModule));
    if (checked.kind === 'unreadable') {
      return { kind: 'unreadable' as const, path: checked.path };
    }

    // Composed on the same terms as the steering command, and the counts with
    // it: `governedFiles` is a union over Modules, which no Module can see to
    // take.
    const answers = [{ module: frontmatterModule.key, check: checked.result }];
    const result = corpusVerdict(files.map(normalisePath), answers);
    return { kind: 'answered' as const, result };
  });
  return { kind: 'check', root, config, outcome };
}

/** Compile-time exhaustiveness: reached only if a switch left a case unhandled. */
function assertNever(value: never): never {
  throw new Error(`unreachable command: ${JSON.stringify(value)}`);
}

/**
 * THE VERB DISPATCH. Every command names its own gatherer, and nothing falls
 * through: `default` is reached only when `invocation.command` is narrowed to
 * `never`, so `Command` growing a sixth member with no case here is a
 * compile error — `assertNever` is passed a value that is no longer `never`
 * — rather than a routed-nowhere command at runtime.
 */
function gatherCommand(invocation: Invocation): Gathered {
  switch (invocation.command) {
    case 'help':
      return { kind: 'help' };
    case 'query':
      return gatherQuery(invocation);
    case 'audit':
      return gatherAudit(invocation);
    case 'assess':
      return gatherAssess(invocation);
    case 'check':
      return gatherCheck(invocation);
    default:
      return assertNever(invocation.command);
  }
}

/**
 * Run one invocation.
 *
 * The runtime is checked BEFORE the argv — `route` is the assertable half of
 * that contract; this is the sequencing half. `--help` sits behind the
 * runtime floor too, which is a choice rather than an oversight: many tools
 * answer help on any runtime, but a caller on an unsupported Node is one
 * command away from a report they must not trust, and the refusal names the
 * supported range while the help text does not. `route` places `--help`
 * behind the floor along with every reporting command, which keeps the
 * ordering above a single rule instead of one with an exception.
 *
 * @param argv The arguments after the executable and script.
 */
export function run(argv: readonly string[]) {
  const routed = route(process.versions.node, argv);
  if (routed.kind !== 'routed') return terminationFor(routed);

  return terminationFor(gatherCommand(routed.invocation));
}
