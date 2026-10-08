// The tool's activity log: one row per invocation, in `docs/markdown-harness/activity.csv`.
//
// WHY THIS EXISTS. Every refusal in `assess-hook.mjs` exits 0 with empty stdout,
// which is the right behaviour and makes silence and death identical from
// outside. Nothing else survives the session, so "the hook is wired" and "the
// hook ran" were the same claim — and measured on 2026-09-09, an agent reported
// a hook as proven while it had not fired once. A row written for every
// invocation that found a config root, INCLUDING the silent ones, is what
// separates the two: a `fresh` row proves the hook ran and chose to say nothing.
//
// WHY NOT `log.md`. OKF §3.1 reserves that filename and §9 defines it as a
// human-authored update history — date-grouped prose entries, newest first.
// Newest-first means prepending, which forfeits the append atomicity this file
// depends on. A different artefact gets a different name. The `.csv` extension
// also means the hook's own `.md` filter excludes this file, so no self-logging
// guard had to be written; it falls out of the naming rather than being
// engineered.
//
// THE GATE. Nothing is written unless `docs/markdown-harness/` already exists.
// `init.mjs` creates it, so a repository that never opted in is never written
// to — the same opt-in contract that keeps the hook silent where no config sits
// above the file.
//
// Deleting that one line does not change behaviour today, and it is still worth
// keeping: the append would then throw `ENOENT` and the hook would swallow it,
// so the opt-in would hold by accident rather than on purpose. Measured
// 2026-09-09 — the line is a no-op under mutation testing until a `mkdirSync`
// appears beside it, at which point an uninvited repository starts collecting a
// file nobody asked for. The suite catches THAT pair, not the line's absence.
// This is the difference between a contract and a side effect of an error path.
//
// ATOMICITY, AND WHERE IT STOPS. One short `appendFileSync` line is atomic
// against concurrent appenders on a local filesystem. A read-filter-rewrite is
// not, so trimming is held behind a slack margin: appends are unconditional and
// the rewrite only runs once the file is over its cap by that margin, which
// keeps the racing window rare rather than closing it. That trade is stated
// here rather than hidden.

import { appendFileSync, existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** Where `init.mjs` puts the folder, and so the gate this module checks. */
export const MEMORY_DIR = join('docs', 'markdown-harness');

const LOG_NAME = 'activity.csv';

/** Four columns, and `file` is the only one that can hold a comma. */
const HEADER = 'time,command,file,result';

/**
 * Retention, as constants with environment overrides. `0` means unbounded.
 *
 * The LINE cap is the only trigger. The day cap is a filter applied during the
 * same rewrite, so `MARKDOWN_HARNESS_LOG_MAX_LINES=0` turns trimming off whole,
 * the day cap included — one trigger rather than two keeps a rewrite from firing
 * on every invocation the moment a single row ages past the window.
 */
const DEFAULT_MAX_LINES = 1000;
const DEFAULT_MAX_DAYS = 30;

/**
 * How far over the line cap the file goes before a rewrite is worth its race.
 *
 * A fraction rather than a count, so a test can set a cap of 2 and cross the
 * margin in four rows while production crosses it in 1100.
 */
const TRIM_SLACK = 0.1;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function logPath(root) {
  return join(root, MEMORY_DIR, LOG_NAME);
}

/** RFC 4180: wrap in double quotes, and double any quote inside. */
function quoted(value) {
  return `"${String(value).split('"').join('""')}"`;
}

/** A non-negative integer from the environment, or the shipped default. */
function cap(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') return fallback;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

/** A row's own instant, or `undefined` when the first field will not parse as one. */
function instantOf(row) {
  const at = Date.parse(row.slice(0, row.indexOf(',')));
  return Number.isNaN(at) ? undefined : at;
}

/**
 * Drop the oldest rows once the file is over its cap by the slack margin.
 *
 * A row whose instant will not parse is KEPT. Dropping it would make a corrupted
 * line disappear silently, which is the opposite of what this file is for; the
 * line cap bounds it either way.
 */
function trim(path) {
  const maxLines = cap('MARKDOWN_HARNESS_LOG_MAX_LINES', DEFAULT_MAX_LINES);
  if (maxLines === 0) return;

  const lines = readFileSync(path, 'utf8')
    .split('\n')
    .filter((line) => line !== '');
  const rows = lines[0] === HEADER ? lines.slice(1) : lines;
  if (rows.length <= maxLines + Math.ceil(maxLines * TRIM_SLACK)) return;

  const maxDays = cap('MARKDOWN_HARNESS_LOG_MAX_DAYS', DEFAULT_MAX_DAYS);
  const oldestKept = Date.now() - maxDays * MS_PER_DAY;
  const recent = maxDays === 0 ? rows : rows.filter((row) => (instantOf(row) ?? oldestKept) >= oldestKept);

  // Written beside the log and renamed over it, so a reader never sees a
  // half-written file. The pid keeps two trimming processes off one temp name.
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, [HEADER, ...recent.slice(-maxLines), ''].join('\n'));
  renameSync(temporary, path);
}

/**
 * Append one row, and report whether there was anywhere to append it.
 *
 * `time` is `toISOString()`: fixed-width UTC, so the file sorts lexicographically
 * and stays oldest-first by construction. `command` is an open vocabulary —
 * `assess` from the hook, `init` and `demo` from the setup scripts. `result` is
 * the CLI's own `state`, or one of the hook's own refusals. Never a bare boolean:
 * `true` would collapse "ran and found nothing" into "ran", which is the
 * distinction this file exists to keep.
 */
export function recordActivity(root, command, file, result) {
  if (!existsSync(join(root, MEMORY_DIR))) return false;

  const path = logPath(root);
  const row = `${new Date().toISOString()},${command},${quoted(file)},${result}\n`;

  // One call whether or not the header is owed, so the first writer cannot leave
  // a header with no row behind it.
  appendFileSync(path, existsSync(path) ? row : `${HEADER}\n${row}`);
  trim(path);
  return true;
}
