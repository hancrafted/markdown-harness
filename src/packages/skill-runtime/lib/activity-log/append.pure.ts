const HEADER = 'time,command,file,result';
const TRIM_SLACK = 0.1;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function quoted(value: string): string {
  return `"${value.split('"').join('""')}"`;
}

function instantOf(row: string): number | undefined {
  const at = Date.parse(row.slice(0, row.indexOf(',')));
  return Number.isNaN(at) ? undefined : at;
}

/** Resolve an optional environment value without treating malformed values as a new retention policy. */
export function normaliseActivityCap(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw.trim() === '') return fallback;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

function trimmed(
  content: string,
  { maxLines, maxDays, now }: { maxLines: number; maxDays: number; now: string },
): string {
  const lines = content.split('\n').filter((line) => line !== '');
  const rows = lines[0] === HEADER ? lines.slice(1) : lines;
  if (rows.length <= maxLines + Math.ceil(maxLines * TRIM_SLACK)) return content;

  const oldestKept = Date.parse(now) - maxDays * MS_PER_DAY;
  const recent = maxDays === 0 ? rows : rows.filter((row) => (instantOf(row) ?? oldestKept) >= oldestKept);
  return [HEADER, ...recent.slice(-maxLines), ''].join('\n');
}

/** Append one RFC 4180 row and apply retention only after the configured slack. */
export function appendActivity(
  current: string,
  {
    instant,
    command,
    file,
    result,
    maxLines,
    maxDays,
    now,
  }: {
    instant: string;
    command: string;
    file: string;
    result: string;
    maxLines: number;
    maxDays: number;
    now: string;
  },
): string {
  const row = `${instant},${command},${quoted(file)},${result}\n`;
  const appended = current === '' ? `${HEADER}\n${row}` : `${current}${row}`;
  return maxLines === 0 ? appended : trimmed(appended, { maxLines, maxDays, now });
}
