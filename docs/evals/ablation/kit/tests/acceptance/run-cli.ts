import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * The repo root, derived from this file's own location rather than from the
 * working directory: the suite must resolve the same way however it is launched.
 */
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** Every fixture path the suite passes on a command line, root-relative. */
export const FIXTURE = {
  root: 'fixtures',
  validConfig: 'fixtures/valid-test-config.yaml',
  walkerConfig: 'fixtures/governs-everything-config.yaml',
  emptyRuleListConfig: 'fixtures/empty-rule-list-config.yaml',
  absentConfig: 'fixtures/no-such-config.yaml',
} as const;

/**
 * An arbitrary JSON tree. Deliberately not the response contract: declaring
 * that is the implementer's job, and a suite that shipped the interfaces would
 * be handing over the answer instead of checking it.
 */
interface JsonNode {
  readonly [key: string]: JsonNode;
}

function fail(reason: string): never {
  throw new Error(
    `acceptance suite cannot start: ${reason}. Declare your CLI entry file in package.json as "bin": { "mh": "<your entry file>" } — the suite spawns node on whatever it names.`,
  );
}

/** The `bin.mh` value, or a thrown explanation of why there isn't one. */
function declaredEntry(): string {
  const manifest = resolve(REPO_ROOT, 'package.json');
  if (!existsSync(manifest)) fail(`no package.json at ${REPO_ROOT}`);

  const parsed: unknown = JSON.parse(readFileSync(manifest, 'utf8'));
  const bin = (parsed as { bin?: unknown }).bin;
  if (typeof bin !== 'object' || bin === null) fail('package.json declares no "bin" field');

  const entry = (bin as { mh?: unknown }).mh;
  if (typeof entry !== 'string' || entry.length === 0) fail('package.json "bin" declares no "mh" entry');

  return entry;
}

function resolveEntry(): string {
  const entry = declaredEntry();
  const absolute = resolve(REPO_ROOT, entry);
  if (!existsSync(absolute)) fail(`bin.mh names "${entry}", and nothing exists there`);
  return absolute;
}

/**
 * Resolved once, at module load. A missing or unresolvable `bin.mh` therefore
 * breaks collection of every test file before a single assertion runs — the
 * suite never skips and never reports green for want of an entry point.
 */
const ENTRY = resolveEntry();

/** Spawns the declared entry on `node`, from the repo root, and captures both streams. */
export function runCli(args: readonly string[]): { status: number | null; stdout: string; stderr: string } {
  const spawned = spawnSync(process.execPath, [ENTRY, ...args], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });

  if (spawned.error !== undefined) fail(`could not spawn node on "${ENTRY}" — ${spawned.error.message}`);

  return { status: spawned.status, stdout: spawned.stdout, stderr: spawned.stderr };
}

/** The same run, with stdout parsed. Reports what it saw when stdout is not JSON. */
export function runJson(args: readonly string[]): { status: number | null; stderr: string; body: JsonNode } {
  const run = runCli(args);
  try {
    return { status: run.status, stderr: run.stderr, body: JSON.parse(run.stdout) as JsonNode };
  } catch {
    throw new Error(`stdout was not JSON for "mh ${args.join(' ')}" — got: ${JSON.stringify(run.stdout)}`);
  }
}

/** Reads a JSON array out of the tree, so a length or a map has something to work on. */
export function nodes(value: JsonNode): readonly JsonNode[] {
  if (!Array.isArray(value)) throw new Error(`expected a JSON array, got: ${JSON.stringify(value)}`);
  return value as readonly JsonNode[];
}

/** Reads a JSON string out of the tree, so it can be compared with one. */
export function text(value: JsonNode): string {
  if (typeof value !== 'string') throw new Error(`expected a JSON string, got: ${JSON.stringify(value)}`);
  return value;
}
