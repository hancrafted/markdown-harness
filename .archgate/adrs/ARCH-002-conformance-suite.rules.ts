/// <reference path="../rules.d.ts" />

// ARCH-002 — Conformance Suite: every Conformance case under
// fixtures/conformance/docs/ carries exactly one machine-readable
// `<!-- expect: VERDICT -->` marker, VERDICT one of PASSES, FAILS or
// UNGOVERNED (ARCH-002 §2, a review duty covers whether the verdict is
// actually correct — this rule only checks presence, singularity and
// vocabulary). Runs at error (ARCH-002 Compliance and Enforcement).
// Self-contained by design: archgate forbids imports between rules files.
const CASE_GLOB = 'fixtures/conformance/docs/**/*.md';
const MARKER_RE = /<!--\s*expect:\s*(\S+?)\s*-->/g;
const KNOWN_VERDICTS = new Set(['PASSES', 'FAILS', 'UNGOVERNED']);

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
  },
} satisfies RuleSet;
