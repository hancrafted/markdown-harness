/// <reference path="../rules.d.ts" />

// ARCH-002 — Conformance Suite: every Conformance case under
// fixtures/conformance/docs/ carries exactly one machine-readable
// `<!-- expect: VERDICT -->` marker, VERDICT one of PASSES, FAILS or
// UNGOVERNED (ARCH-002 §2, a review duty covers whether the verdict is
// actually correct — this rule only checks presence, singularity and
// vocabulary). Runs at error (ARCH-002 Compliance and Enforcement).
//
// ARCH-002 §4 adds a SECOND marker, `<!-- assess: ACTION -->`, held by its own
// rule below. The two are deliberately separate: `expect:` is required exactly
// once on every case, while `assess:` is optional and at most once, and one
// rule holding both cardinalities would have to be read twice to be understood.
// The regexes cannot collide — each names its own keyword — which is why adding
// the second marker needed no change to the first rule.
//
// Self-contained by design: archgate forbids imports between rules files.
const CASE_GLOB = 'fixtures/conformance/docs/**/*.md';
const MARKER_RE = /<!--\s*expect:\s*(\S+?)\s*-->/g;
const KNOWN_VERDICTS = new Set(['PASSES', 'FAILS', 'UNGOVERNED']);
const ASSESS_RE = /<!--\s*assess:\s*(\S+?)\s*-->/g;
const KNOWN_ACTIONS = new Set(['REVIEW', 'PROCEED', 'FIX_FILE']);

export default {
  rules: {
    'expect-marker': {
      description:
        'Every Conformance case under fixtures/conformance/docs/ carries exactly one `<!-- expect: VERDICT -->` marker, VERDICT one of PASSES, FAILS, or UNGOVERNED.',
      severity: 'error',
      async check(ctx) {
        const files = await ctx.glob(CASE_GLOB);
        for (const file of files) {
          const content = await ctx.readFile(file);
          const matches = [...content.matchAll(MARKER_RE)];

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
        'A Conformance case carries at most one `<!-- assess: ACTION -->` marker, ACTION one of REVIEW, PROCEED, or FIX_FILE. Absence is legal; a second marker is not.',
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
  },
} satisfies RuleSet;
