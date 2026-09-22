import { appendFileSync, existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadRuntime } from './runtime.mjs';

export const MEMORY_DIR = join('docs', 'markdown-harness');

const LOG_NAME = 'activity.csv';
const HEADER = 'time,command,file,result';
const DEFAULT_MAX_LINES = 1000;
const DEFAULT_MAX_DAYS = 30;

function bootstrapRow(instant, command, file, result) {
  return `${instant},${command},"${String(file).split('"').join('""')}",${result}\n`;
}

/**
 * Preserve the activity proof before the package exists.
 *
 * This branch is only reachable for the hook's `not-installed` result, the
 * very state the activity log distinguishes from an ordinary silent read.
 */
function appendBootstrap(path, instant, command, file, result) {
  const row = bootstrapRow(instant, command, file, result);
  appendFileSync(path, existsSync(path) ? row : `${HEADER}\n${row}`);
}

/** Append one activity row, or return false when the repository never opted in. */
export async function recordActivity(root, command, file, result) {
  if (!existsSync(join(root, MEMORY_DIR))) return false;

  const path = join(root, MEMORY_DIR, LOG_NAME);
  const instant = new Date().toISOString();
  const loaded = await loadRuntime(root, 'activity-log');
  if (loaded.kind === 'missing-package') {
    if (command !== 'assess' || result !== 'not-installed') return false;
    appendBootstrap(path, instant, command, file, result);
    return true;
  }
  if (loaded.kind === 'missing-runtime') return false;

  const { runtime } = loaded;
  const maxLines = runtime.normaliseActivityCap(process.env.MARKDOWN_HARNESS_LOG_MAX_LINES, DEFAULT_MAX_LINES);
  const maxDays = runtime.normaliseActivityCap(process.env.MARKDOWN_HARNESS_LOG_MAX_DAYS, DEFAULT_MAX_DAYS);
  const current = existsSync(path) ? readFileSync(path, 'utf8') : '';
  const next = runtime.appendActivity(current, { instant, command, file, result, maxLines, maxDays, now: instant });

  if (next.startsWith(current)) {
    appendFileSync(path, next.slice(current.length));
    return true;
  }

  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, next);
  renameSync(temporary, path);
  return true;
}
