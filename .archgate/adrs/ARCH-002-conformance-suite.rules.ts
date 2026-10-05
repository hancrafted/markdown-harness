/// <reference path="../rules.d.ts" />

// ARCH-002 — Conformance Suite: every Conformance case under a tier's
// `docs/` carries exactly one machine-readable `<!-- expect: VERDICT -->`
// marker, VERDICT one of PASSES, FAILS or UNGOVERNED (ARCH-002 §2, a review
// duty covers whether the verdict is actually correct — this rule only checks
// presence, singularity and vocabulary). Runs at error (ARCH-002 Compliance and
// Enforcement).
//
// ARCH-002 §4 adds a SECOND marker, `<!-- assess: ACTION -->`, held by its own
// rule below. The two are deliberately separate: `expect:` is required exactly
// once on every case, while `assess:` is optional and at most once, and one
// rule holding both cardinalities would have to be read twice to be understood.
// The regexes cannot collide — each names its own keyword — which is why adding
// the second marker needed no change to the first rule.
//
// THE GLOB CARRIES A TIER SEGMENT. `fixtures/conformance/` holds tiers, one
// directory per Module plus one for rejected config, and only a Module tier
// holds documents — a rejected-config case is config bytes and a frozen
// expectation, never markdown. `*/docs/**` is what reaches the cases without
// reaching the tier next door.
//
// A GLOB THAT MATCHES NOTHING IS A VIOLATION, held by `expect-marker` below.
// Both rules loop over this one glob, so one guard proves its reach for both
// and a second would report the same fact twice.
//
// SPEC-FOLDER TIERS (#231). In a tier listed in SPEC_FOLDER_TIERS, every
// directory directly under `docs/` is a spec folder: a synthetic repo root with
// the adopter's config file. Three rules below hold its shape, and each loops
// over EVERY spec folder through `ctx.glob`, never over the changed files alone,
// so a folder nobody touched is still held. A tier joins the list in the change
// that migrates it.
//
// A VERBATIM CASE is the one exception to `expect-marker`: its bytes are a
// copy that cannot carry a marker, so the `verbatim-cases.json` beside it states
// its verdict, and the rule reads that verdict for exactly the paths the
// manifest lists.
//
// Self-contained by design: archgate forbids imports between rules files.
const CASE_GLOB = 'fixtures/conformance/*/docs/**/*.md';
const SPEC_FOLDER_TIERS = ['body-structure', 'integrated'];
const SPEC_CONFIG = 'markdown-harness.config.yaml';
const VERBATIM_MANIFEST = 'verbatim-cases.json';
const MANIFEST_GLOB = `fixtures/conformance/*/docs/*/${VERBATIM_MANIFEST}`;
const SPEC_LINE_RE = /^# Spec: \S/;
const FOLDER_NAME_RE = /^([A-Za-z][A-Za-z0-9]*(?:\.[A-Za-z][A-Za-z0-9]*)*)__([a-z0-9]+(?:-[a-z0-9]+)*)$/;
const CONTEXT_FILE = 'CONTEXT.md';
const MARKER_RE = /<!--\s*expect:\s*(\S+?)\s*-->/g;
const KNOWN_VERDICTS = new Set(['PASSES', 'FAILS', 'UNGOVERNED']);
const ASSESS_RE = /<!--\s*assess:\s*(\S+?)\s*-->/g;
const KNOWN_ACTIONS = new Set(['REVIEW', 'PROCEED', 'FIX_FILE']);

/** The spec-folder name a case or config path sits in, or undefined outside a spec-folder tier. */
function specFolderOf(file: string): string | undefined {
  const parts = file.split('/');
  if (parts[0] !== 'fixtures' || parts[1] !== 'conformance' || parts[3] !== 'docs' || parts.length < 6)
    return undefined;
  if (!SPEC_FOLDER_TIERS.includes(parts[2])) return undefined;
  return parts.slice(0, 5).join('/');
}

/** Every spec folder the tree holds, found through the cases and files under each spec-folder tier's docs/. */
async function specFolders(ctx: RuleContext): Promise<string[]> {
  const found = new Set<string>();
  for (const tier of SPEC_FOLDER_TIERS) {
    for (const file of await ctx.glob(`fixtures/conformance/${tier}/docs/*/**`)) {
      const folder = specFolderOf(file);
      if (folder !== undefined) found.add(folder);
    }
  }
  return [...found].sort();
}

/** The verdict every verbatim manifest states, keyed by the case's repo-relative path. */
async function verbatimVerdicts(ctx: RuleContext): Promise<Map<string, string>> {
  const verdicts = new Map<string, string>();
  for (const manifest of await ctx.glob(MANIFEST_GLOB)) {
    const folder = manifest.slice(0, -VERBATIM_MANIFEST.length - 1);
    const entries = JSON.parse(await ctx.readFile(manifest)) as Record<string, { verdict?: unknown }>;
    for (const [path, entry] of Object.entries(entries)) verdicts.set(`${folder}/${path}`, String(entry.verdict));
  }
  return verdicts;
}

/** A spec folder's config text, or undefined when the folder holds none. */
async function configOf(ctx: RuleContext, folder: string): Promise<string | undefined> {
  const [config] = await ctx.glob(`${folder}/${SPEC_CONFIG}`);
  return config === undefined ? undefined : ctx.readFile(config);
}

/** Whether a YAML text writes `key` as a mapping key on some non-comment line. */
function writesKey(yaml: string, key: string): boolean {
  const re = new RegExp(`(?:^|[\\s{,])-?\\s*${key}:`, 'u');
  return yaml.split('\n').some((line) => !line.trimStart().startsWith('#') && re.test(line));
}

/**
 * The reach guard every spec-folder rule shares: a spec-folder tier that
 * enumerates no folder is reported, because a loop over none passes over nothing.
 */
function reportEmpty(ctx: RuleContext, folders: readonly string[], ruleId: string): boolean {
  if (folders.length > 0) return false;
  ctx.report.violation({
    message: `No spec folder found under ${SPEC_FOLDER_TIERS.map((tier) => `fixtures/conformance/${tier}/docs/`).join(', ')} — the tier moved or was renamed, and nothing is being governed (ARCH-002 [${ruleId}]).`,
  });
  return true;
}

export default {
  rules: {
    'expect-marker': {
      description:
        "Every Conformance case under a tier's docs/ carries exactly one `<!-- expect: VERDICT -->` marker, VERDICT one of PASSES, FAILS, or UNGOVERNED — and the case glob matching nothing is itself a violation.",
      severity: 'error',
      async check(ctx) {
        const files = await ctx.glob(CASE_GLOB);

        // THE REACH GUARD. A loop over zero files reports success over
        // nothing, so a corpus that moved out from under this glob would leave
        // the gate green while governing not one case. The sibling test can
        // prove what this rule DECIDES and can never prove what it REACHES;
        // reach is only provable against the real tree, by moving the fixtures
        // without moving the glob and watching this fire.
        if (files.length === 0) {
          ctx.report.violation({
            message: `The Conformance case glob '${CASE_GLOB}' matched no files — the corpus moved, or a tier was renamed, and nothing is being governed (ARCH-002 [expect-marker]).`,
          });
          return;
        }

        const verbatim = await verbatimVerdicts(ctx);
        for (const file of files) {
          const content = await ctx.readFile(file);
          const matches = [...content.matchAll(MARKER_RE)];

          // THE VERBATIM EXCEPTION: a listed path carries no marker, because its
          // bytes are a copy, and its manifest entry states a known verdict instead.
          const listed = verbatim.get(file);
          if (listed !== undefined) {
            if (matches.length > 0) {
              ctx.report.violation({
                message: `Verbatim case carries an expect marker — its bytes are a copy, so its verdict lives in ${VERBATIM_MANIFEST} alone (ARCH-002 [expect-marker]).`,
                file,
              });
            } else if (!KNOWN_VERDICTS.has(listed)) {
              ctx.report.violation({
                message: `Verbatim case's ${VERBATIM_MANIFEST} entry names an unknown verdict '${listed}' — use PASSES, FAILS, or UNGOVERNED (ARCH-002 [expect-marker]).`,
                file,
              });
            }
            continue;
          }

          if (matches.length === 0) {
            ctx.report.violation({
              message: `Conformance case has no expect marker — add exactly one '<!-- expect: PASSES|FAILS|UNGOVERNED -->' (ARCH-002 [expect-marker]).`,
              file,
            });
            continue;
          }

          if (matches.length > 1) {
            ctx.report.violation({
              message: `Conformance case carries ${matches.length} expect markers — exactly one is required (ARCH-002 [expect-marker]).`,
              file,
            });
            continue;
          }

          const verdict = matches[0][1];
          if (!KNOWN_VERDICTS.has(verdict)) {
            ctx.report.violation({
              message: `Conformance case's expect marker names an unknown verdict '${verdict}' — use PASSES, FAILS, or UNGOVERNED (ARCH-002 [expect-marker]).`,
              file,
            });
          }
        }
      },
    },

    'assess-marker': {
      description:
        'A Conformance case carries at most one `<!-- assess: ACTION -->` marker, ACTION one of REVIEW, PROCEED, or FIX_FILE. Absence is legal; a second marker is not. It loops the same case glob as `expect-marker`, whose empty-match guard proves that glob reaches the tree for both.',
      severity: 'error',
      async check(ctx) {
        const files = await ctx.glob(CASE_GLOB);
        for (const file of files) {
          const content = await ctx.readFile(file);
          const matches = [...content.matchAll(ASSESS_RE)];

          // ZERO IS LEGAL, and this is the whole difference from `expect-marker`.
          // The Assessment markers cover the five states deliberately rather
          // than exhaustively: a freshness answer is meaningless for most of
          // this corpus, so requiring one everywhere would force a claim onto
          // cases that make none.
          if (matches.length === 0) continue;

          if (matches.length > 1) {
            ctx.report.violation({
              message: `Conformance case carries ${matches.length} assess markers — at most one is allowed (ARCH-002 [assess-marker]).`,
              file,
            });
            continue;
          }

          const action = matches[0][1];
          if (!KNOWN_ACTIONS.has(action)) {
            ctx.report.violation({
              message: `Conformance case's assess marker names an unknown agent action '${action}' — use REVIEW, PROCEED, or FIX_FILE (ARCH-002 [assess-marker]).`,
              file,
            });
          }
        }
      },
    },

    'spec-line': {
      description:
        "Every spec folder holds the adopter's config file, and its first line is `# Spec: <sentence>`, so a human opening the folder reads what it specifies first.",
      severity: 'error',
      async check(ctx) {
        const folders = await specFolders(ctx);
        if (reportEmpty(ctx, folders, 'spec-line')) return;
        for (const folder of folders) {
          const config = await configOf(ctx, folder);
          if (config === undefined) {
            ctx.report.violation({
              message: `Spec folder holds no ${SPEC_CONFIG} — every spec folder is a synthetic repo root with the adopter's config file (ARCH-002 [spec-line]).`,
              file: folder,
            });
            continue;
          }
          if (!SPEC_LINE_RE.test(config.split('\n', 1)[0])) {
            ctx.report.violation({
              message: `Spec folder config does not open with '# Spec: <sentence>' on line 1 (ARCH-002 [spec-line]).`,
              file: `${folder}/${SPEC_CONFIG}`,
            });
          }
        }
      },
    },

    'spec-folder-key': {
      description:
        'A spec folder is named `<key>__<behaviour>`: the behaviour is kebab-case, and the key is one its config writes (each segment of a dotted path), or a family term CONTEXT.md defines.',
      severity: 'error',
      async check(ctx) {
        const folders = await specFolders(ctx);
        if (reportEmpty(ctx, folders, 'spec-folder-key')) return;
        const [context] = await ctx.glob(CONTEXT_FILE);
        const glossary = context === undefined ? '' : await ctx.readFile(context);
        for (const folder of folders) {
          const name = folder.split('/').pop() ?? '';
          const match = FOLDER_NAME_RE.exec(name);
          if (match === null) {
            ctx.report.violation({
              message: `Spec folder '${name}' is not named '<key>__<behaviour>' with a camelCase key and a kebab-case behaviour (ARCH-002 [spec-folder-key]).`,
              file: folder,
            });
            continue;
          }
          const key = match[1];
          const config = (await configOf(ctx, folder)) ?? '';
          const written = key.split('.').every((segment) => writesKey(config, segment));
          const family = glossary.includes(`\n**${key}**:`);
          if (!written && !family) {
            ctx.report.violation({
              message: `Spec folder '${name}' names the key '${key}', which its config never writes and ${CONTEXT_FILE} does not define — name the key the folder tests (ARCH-002 [spec-folder-key]).`,
              file: folder,
            });
          }
        }
      },
    },

    'spec-folder-passes': {
      description:
        'Every spec folder holds at least one governed PASSES case — a case whose expect marker, or verbatim manifest entry, says PASSES — so no folder states only what fails.',
      severity: 'error',
      async check(ctx) {
        const folders = await specFolders(ctx);
        if (reportEmpty(ctx, folders, 'spec-folder-passes')) return;
        const verbatim = await verbatimVerdicts(ctx);
        for (const folder of folders) {
          let passes = false;
          for (const file of await ctx.glob(`${folder}/**/*.md`)) {
            const stated =
              verbatim.get(file) ?? [...(await ctx.readFile(file)).matchAll(MARKER_RE)].map((m) => m[1])[0];
            if (stated === 'PASSES') {
              passes = true;
              break;
            }
          }
          if (!passes) {
            ctx.report.violation({
              message: `Spec folder holds no PASSES case — add a minimal governed case that passes beside what fails or goes ungoverned (ARCH-002 [spec-folder-passes]).`,
              file: folder,
            });
          }
        }
      },
    },
  },
} satisfies RuleSet;
