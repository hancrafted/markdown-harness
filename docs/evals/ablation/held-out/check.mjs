// Layer 1b. Applied over a run's output tree at scoring time; never stamped into
// a run, so nothing here can be taught to.
//
// This is a graded axis, not a gate: a run that fails an edge is still functional.
// So edge failures are tabulated and the process still exits 0. A non-zero exit
// means the *instrument* could not run -- no resolvable bin.mh, unparseable stdout
// where the spec promises JSON -- which is a different fact and must not be
// mistaken for a run that scored zero.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(HERE, 'fixtures');

const runDir = process.argv[2];
if (!runDir) die('usage: node check.mjs <run-directory>');
const RUN = resolve(runDir);

function die(reason) {
  process.stderr.write(`held-out: ${reason}\n`);
  process.exit(2);
}

/** The run's declared entry point. Resolved once: without it there is nothing to score. */
function entryPoint() {
  const manifest = resolve(RUN, 'package.json');
  if (!existsSync(manifest)) die(`no package.json at ${RUN}`);
  let bin;
  try {
    bin = JSON.parse(readFileSync(manifest, 'utf8')).bin;
  } catch (e) {
    die(`package.json is not JSON: ${e.message}`);
  }
  const named = typeof bin === 'string' ? bin : bin?.mh;
  if (typeof named !== 'string' || named.length === 0) die('package.json declares no bin.mh');
  const abs = resolve(RUN, named);
  if (!existsSync(abs)) die(`bin.mh names "${named}", and nothing exists there`);
  return abs;
}

const ENTRY = entryPoint();

/**
 * Spawned with cwd at the held-out fixtures, so --root and --config resolve to
 * them rather than to anything the run shipped. The entry path is absolute, which
 * is what makes that safe.
 */
function run(args) {
  const r = spawnSync(process.execPath, [ENTRY, ...args], { cwd: FIXTURES, encoding: 'utf8' });
  if (r.error) die(`could not spawn node on ${ENTRY}: ${r.error.message}`);
  let body = null;
  if (r.stdout.trim().length > 0) {
    try {
      body = JSON.parse(r.stdout);
    } catch {
      body = null; // Left null on purpose: several edges assert stdout is empty.
    }
  }
  return { status: r.status, stdout: r.stdout, stderr: r.stderr, body };
}

const CHECK = ['--check', '--root', 'corpus', '--config', 'config.yaml'];

/** Every file entry of one --check response, keyed by path, for the edges below. */
function checkFiles() {
  const r = run(CHECK);
  if (!r.body) die(`--check produced no JSON. stdout was: ${JSON.stringify(r.stdout.slice(0, 300))}`);
  const files = r.body.result?.files ?? r.body.files ?? [];
  const byPath = new Map();
  for (const f of files) byPath.set(f.path ?? f.file, f);
  return { response: r, byPath };
}

const { byPath } = checkFiles();

/** The violations reported for one corpus path, or [] when the file is conforming. */
function vios(p) {
  return byPath.get(p)?.violations ?? [];
}
const codes = (p) => vios(p).map((v) => v.violation);
const has = (p, code) => codes(p).includes(code);
const only = (p, code) => codes(p).length === 1 && codes(p)[0] === code;
const at = (p, code) => vios(p).find((v) => v.violation === code);

const edges = [
  {
    id: 'E1',
    spec: '§4.7',
    why: 'a block that exists and will not parse',
    expected: 'FRONTMATTER_UNPARSEABLE, alone, field null',
    run: () => {
      const p = 'broken/unparseable.md';
      const v = at(p, 'FRONTMATTER_UNPARSEABLE');
      return [only(p, 'FRONTMATTER_UNPARSEABLE') && v?.field === null, codes(p).join(',') || 'none'];
    },
  },
  {
    id: 'E2',
    spec: '§4.7',
    why: 'a block that parses to a list, not a mapping',
    expected: 'the same FRONTMATTER_UNPARSEABLE',
    run: () => {
      const p = 'broken/nonmapping.md';
      return [only(p, 'FRONTMATTER_UNPARSEABLE'), codes(p).join(',') || 'none'];
    },
  },
  {
    id: 'E3',
    spec: '§4.7',
    why: 'an unparseable block under frontmatter: forbidden',
    expected: 'FRONTMATTER_FORBIDDEN, no value key, no UNPARSEABLE',
    run: () => {
      const p = 'forbidden/broken.md';
      const v = at(p, 'FRONTMATTER_FORBIDDEN');
      const ok = v !== undefined && !('value' in v) && !has(p, 'FRONTMATTER_UNPARSEABLE');
      return [ok, `${codes(p).join(',') || 'none'}${v && 'value' in v ? ' (+value)' : ''}`];
    },
  },
  {
    id: 'E4',
    spec: '§4.7',
    why: 'an immediately closed fence parses to {}',
    expected: 'MISSING_REQUIRED_FIELD, not UNPARSEABLE',
    run: () => {
      const p = 'broken/emptyfence.md';
      return [has(p, 'MISSING_REQUIRED_FIELD') && !has(p, 'FRONTMATTER_UNPARSEABLE'), codes(p).join(',') || 'none'];
    },
  },
  {
    id: 'E5',
    spec: '§4.7',
    why: 'no fence at all reads as {}',
    expected: 'MISSING_REQUIRED_FIELD',
    run: () => {
      const p = 'broken/nofence.md';
      return [has(p, 'MISSING_REQUIRED_FIELD') && !has(p, 'FRONTMATTER_UNPARSEABLE'), codes(p).join(',') || 'none'];
    },
  },
  {
    id: 'E6',
    spec: '§3.3',
    why: 'an empty string does not satisfy a cross-field set',
    expected: 'ALL_OF_UNSATISFIED, satisfied excludes title',
    run: () => {
      const p = 'crossfield/empty-title.md';
      const v = at(p, 'ALL_OF_UNSATISFIED');
      const sat = v?.satisfied ?? [];
      return [v !== undefined && !sat.includes('title'), v ? `satisfied=[${sat.join(',')}]` : 'no ALL_OF_UNSATISFIED'];
    },
  },
  {
    id: 'E7',
    spec: '§4.6',
    why: 'an entry address over a value that is not a list',
    expected: 'one CONSTRAINT_SHAPE_MISMATCH, no per-entry violation',
    run: () => {
      const p = 'entries/nonlist.md';
      const c = codes(p).filter((x) => x === 'CONSTRAINT_SHAPE_MISMATCH');
      return [c.length === 1 && !has(p, 'MISSING_REQUIRED_FIELD'), codes(p).join(',') || 'none'];
    },
  },
  {
    id: 'E8',
    spec: '§4.6',
    why: 'violation order inside one file',
    expected: 'field, then cross-field, then unknown-key',
    run: () => {
      const p = 'crossfield/ordering.md';
      const kinds = vios(p).map((v) =>
        v.violation === 'UNKNOWN_KEY_FORBIDDEN'
          ? 'unknown'
          : v.violation.startsWith('ALL_OF') ||
              v.violation.startsWith('ANY_OF') ||
              v.violation.startsWith('EXACTLY_ONE_OF')
            ? 'cross'
            : 'field',
      );
      const want = ['field', 'cross', 'unknown'];
      return [kinds.join(',') === want.join(','), kinds.join(',') || 'none'];
    },
  },
  {
    id: 'E9',
    spec: '§3.3',
    why: 'human is a reserved producer in the slash form',
    expected: 'FORMAT_MISMATCH on generated.by',
    run: () => {
      const p = 'formats/reserved.md';
      const v = vios(p).find((x) => x.field === 'generated.by');
      return [v?.violation === 'FORMAT_MISMATCH', v ? v.violation : codes(p).join(',') || 'none'];
    },
  },
  {
    id: 'E10',
    spec: '§3.3',
    why: 'datetime is form only: no calendar arithmetic',
    expected: 'no violation on generated.at for 2026-02-30',
    run: () => {
      const p = 'formats/calendar.md';
      const v = vios(p).find((x) => x.field === 'generated.at');
      return [v === undefined, v ? v.violation : 'none'];
    },
  },
  {
    id: 'E11',
    spec: '§2',
    why: 'a flag given twice is conflicting input',
    expected: 'exit 2, stdout empty, usage on stderr',
    run: () => {
      const r = run(['--check', '--root', 'corpus', '--root', 'corpus', '--config', 'config.yaml']);
      const ok = r.status === 2 && r.stdout.trim() === '' && r.stderr.trim() !== '';
      return [ok, `exit ${r.status}, stdout ${r.stdout.trim() === '' ? 'empty' : 'non-empty'}`];
    },
  },
  {
    id: 'E12',
    spec: '§2',
    why: 'a --root that does not exist',
    expected: 'exit 2, stdout empty — never invalidFiles: 0',
    run: () => {
      const r = run(['--check', '--root', 'no-such-directory', '--config', 'config.yaml']);
      const ok = r.status === 2 && r.stdout.trim() === '';
      return [ok, `exit ${r.status}, stdout ${r.stdout.trim() === '' ? 'empty' : 'non-empty'}`];
    },
  },
  {
    id: 'E13',
    spec: '§3.5',
    why: 'a duplicate ruleId points at the later occurrence',
    expected: 'CONFIG_DUPLICATE_RULE_ID at frontmatter.rules[1].ruleId',
    run: () => {
      const r = run(['--check', '--root', 'corpus', '--config', 'dup-ruleid-config.yaml']);
      const faults = r.body?.result?.faults ?? r.body?.faults ?? [];
      const f = faults.find((x) => x.code === 'CONFIG_DUPLICATE_RULE_ID');
      return [
        r.status === 2 && f?.location === 'frontmatter.rules[1].ruleId',
        f ? f.location : `exit ${r.status}, no such fault`,
      ];
    },
  },
  {
    id: 'E14',
    spec: '§3.5',
    why: 'a rule with no ruleId at all',
    expected: 'CONFIG_INVALID_VALUE at frontmatter.rules[0].ruleId',
    run: () => {
      const r = run(['--check', '--root', 'corpus', '--config', 'no-ruleid-config.yaml']);
      const faults = r.body?.result?.faults ?? r.body?.faults ?? [];
      const f = faults.find((x) => x.location === 'frontmatter.rules[0].ruleId');
      return [
        r.status === 2 && f?.code === 'CONFIG_INVALID_VALUE',
        f ? f.code : `exit ${r.status}, no fault at that location`,
      ];
    },
  },
];

let passed = 0;
const rows = [];
for (const e of edges) {
  let ok = false;
  let observed = '';
  try {
    [ok, observed] = e.run();
  } catch (err) {
    observed = `threw: ${err.message}`;
  }
  if (ok) passed += 1;
  rows.push(`| ${e.id} | ${e.spec} | ${e.why} | ${e.expected} | ${observed} | ${ok ? 'yes' : 'NO'} |`);
}

process.stdout.write(`## Held-out edges (layer 1b)\n\n**${passed} of ${edges.length}**\n\n`);
process.stdout.write('| edge | spec | why | expected | observed | pass |\n');
process.stdout.write('| --- | --- | --- | --- | --- | --- |\n');
process.stdout.write(`${rows.join('\n')}\n`);
