/// <reference path="../rules.d.ts" />

// GEN-003 — Codebase Hygiene: repo-wide Disciplines binding every file under
// src/ whatever its language. One Discipline so far; add an anchor per rule.
//
// `no-eslint-disable` — inline lint suppression stays unspent. eslint.config.mjs
// is the single source of truth for what this repo enforces; a directive comment
// forks that truth at one line and does it invisibly, since `npm run verify`
// stays green while the rule stops holding at that site (GEN-003 §2). Runs at
// error (GEN-001 §7). Self-contained by design: archgate forbids imports
// between rules files.
const SRC_GLOB = 'src/**/*';

// An eslint directive is only live as the FIRST token of a comment, so the
// opener must sit immediately before the keyword — prose naming a directive is
// not one, which is what keeps this ADR's own vocabulary writable. Matched
// textually rather than through ctx.ast(), so the ban reaches every language
// under src/, including files eslint is not configured to lint (GEN-003 §2.4).
// `enable` rides along: once every disable is gone it is dead weight pointing
// at a suppression that is not there (GEN-003 §2.1).
const ESLINT_DIRECTIVE_RE = /(?:\/\/|\/\*)[ \t]*eslint-(?:disable|enable)\b/;

export default {
  rules: {
    'no-eslint-disable': {
      description:
        'No file under src/ carries an eslint directive comment — eslint-disable, its -line and -next-line variants, or the paired enable — in either the // or the /* */ form. A lint rule wrong for a class of files is turned off in eslint.config.mjs behind a files: glob; a lint rule wrong at one site means the code is wrong.',
      severity: 'error',
      async check(ctx) {
        for (const hit of await ctx.grepFiles(ESLINT_DIRECTIVE_RE, SRC_GLOB)) {
          ctx.report.violation({
            message: `Inline eslint suppression — delete the directive and fix the code, or turn the rule off in eslint.config.mjs behind a files: glob carrying its reason (GEN-003 [no-eslint-disable]).`,
            file: hit.file,
            line: hit.line,
          });
        }
      },
    },
  },
} satisfies RuleSet;
