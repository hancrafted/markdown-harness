/**
 * The naming instrument: bare "harness" and the product's banned synonyms, in
 * THIS REPO'S OWN PROSE.
 *
 * `CONTEXT.md` has forbidden these words since the glossary was written, and
 * they went in anyway — six consecutive commits on one branch carried the defect
 * and every one of them passed a check. What settles it is not more care, and
 * the reason is mechanical rather than moral: A LINE-BASED SEARCH CANNOT SEE A
 * SENTENCE THAT WRAPS. With `the` ending one line and `harness` beginning the
 * next, `grep` is blind to the single most common occurrence. Measured on the
 * commit that prompted this file: a hand grep found one of two, and a review
 * pass over the same diff found three of eight. So this collapses newlines and
 * comment leaders before matching anything.
 *
 * THE VOCABULARY IS NOT DUPLICATED HERE. It is parsed out of `CONTEXT.md` at
 * check time, from the `_Avoid_:` lines of the two entries whose confusion the
 * rule exists to prevent — `markdown-harness` and `Host harness`. A copy is what
 * drifts, and this repo has already rewritten one document (`docs/agents/domain.md`)
 * for exactly that reason: the source stays authoritative and prose about it does
 * not get a second vote.
 *
 * Two scoping decisions, both measured rather than guessed. Run over the whole
 * repo the same patterns match 241 bare "harness" and 35 banned synonyms, and
 * almost none is a fault: `.agents/skills/**` is vendored third-party text that
 * uses "harness" for its own unrelated concept, and `docs/research/**` quotes
 * other projects' documentation, where "the plugin" correctly means Obsidian's.
 * So only this repo's own prose is in scope. And three files are exempt because
 * their job is to STATE the rule, which they cannot do without naming what they
 * ban.
 */

import { globSync, readFileSync } from 'node:fs';

/** This repo's own prose about its own product. Everything else is vendored or quoted. */
const OWN_PROSE = [
  'src/**/*.ts',
  'fixtures/**/*.{md,yaml}',
  'docs/design-adr/**/*.md',
  'docs/vision/**/*.md',
  'docs/agents/**/*.md',
  'markdown-harness.config*.yaml',
];

/**
 * The files that define the rule, and therefore have to quote it.
 *
 * Deliberately three names rather than a marker comment: an inline suppression
 * would be available everywhere and would end up used everywhere, and the whole
 * value of this check is that it cannot be waved through in the place it matters.
 */
const DEFINES_THE_RULE = ['CONTEXT.md', 'AGENTS.md', 'CLAUDE.md', 'README.md'];

/**
 * The glossary entry whose synonyms get gated: the PRODUCT's.
 *
 * `Host harness` carries an `_Avoid_` list too and it is deliberately not read.
 * Measured: its entries are `wrapper`, `agent host`, `agent runtime` and `IDE`,
 * and `wrapper` alone produced four faults in this repo that were all correct
 * English about a DATA STRUCTURE — "the wrapper was charged on every violation"
 * is about a tagged union, not about Claude Code. Misnaming a Host harness is a
 * real fault and a rare one; misnaming the product is the fault that recurred
 * six times. The bare-word check below covers the ambiguity these two entries
 * share, which is the word they both ban.
 */
const PRODUCT_TERM = '`markdown-harness`';

/**
 * Legitimate qualifications of "harness". Anything else is the bare form.
 *
 * CASE-INSENSITIVE, and that is a decision rather than laziness: `docs/vision/`
 * writes "host harness" in running prose where `CONTEXT.md` defines the term as
 * "Host harness". The word is QUALIFIED either way — a reader knows which
 * harness is meant — and whether the term is capitalised mid-sentence is a
 * style question this instrument has no business failing a build over.
 */
const QUALIFIED = /(?:markdown-|frontmatter-|host\s)harness/i;

/**
 * The banned synonyms, read from `CONTEXT.md` rather than listed here.
 *
 * Only the single-word ones become patterns, and only behind a determiner. The
 * bare word is unusable as a signal — "tool" appears 194 times in this repo and
 * "template" 48, nearly all of them about somebody else's tool or a real
 * template — while "the tool" and "a template" naming THIS product are exactly
 * the misuse the glossary forbids.
 */
function bannedSynonyms(context: string): readonly string[] {
  const block = context.slice(context.indexOf(`**${PRODUCT_TERM}**`));
  const avoid = /_Avoid_: ([^\n]+)/.exec(block);
  if (avoid === null) throw new Error(`CONTEXT.md has no _Avoid_ line under ${PRODUCT_TERM}`);

  return (
    avoid[1]
      .split(',')
      .map((entry) => entry.trim())
      // Single words only, and never "harness" itself: the bare-word check owns
      // that one, and a multi-word entry like "the harness" is already covered by
      // it. Anything left is a noun this product must not be called.
      .filter((entry) => /^[a-z]+$/.test(entry) && entry !== 'harness')
  );
}

/**
 * The text with every newline and comment leader collapsed to one space.
 *
 * THE WHOLE POINT OF THIS FILE. A doc comment wraps at 80 columns, so the
 * sentence a reader sees is not the line a matcher sees.
 */
function joined(text: string): string {
  return text.replace(/\s*\n\s*(?:\*|\/\/|#)?\s*/g, ' ');
}

interface Fault {
  file: string;
  token: string;
  context: string;
}

function faultsIn(file: string, text: string, synonyms: readonly string[]): readonly Fault[] {
  const found: Fault[] = [];
  const haystack = joined(text);

  const patterns: readonly [RegExp, string][] = [
    [/\bharness(?:es|'s)?\b/gi, 'bare "harness"'],
    [new RegExp(String.raw`\b(?:the|this|a|an|our|its)\s+(?:${synonyms.join('|')})\b`, 'gi'), 'product synonym'],
  ];

  for (const [pattern, token] of patterns) {
    for (const match of haystack.matchAll(pattern)) {
      const at = match.index;
      // `markdown-harness` and `Host harness` are the qualified forms the rule
      // asks for, and the lookbehind has to reach back far enough to see them.
      if (token.includes('harness') && QUALIFIED.test(haystack.slice(Math.max(0, at - 20), at + match[0].length))) {
        continue;
      }
      found.push({ file, token, context: haystack.slice(Math.max(0, at - 60), at + match[0].length + 45).trim() });
    }
  }
  return found;
}

const context = readFileSync('CONTEXT.md', 'utf8');
const synonyms = bannedSynonyms(context);

const files = OWN_PROSE.flatMap((pattern) => globSync(pattern, { exclude: ['**/node_modules/**'] }))
  .filter((file) => !DEFINES_THE_RULE.includes(file))
  .sort();

const faults = files.flatMap((file) => faultsIn(file, readFileSync(file, 'utf8'), synonyms));

if (faults.length > 0) {
  process.stderr.write(
    `Naming: ${faults.length} fault(s). CONTEXT.md bans these for the product; qualify or rename.\n`,
  );
  process.stderr.write(`Banned synonyms, read from CONTEXT.md: ${synonyms.join(', ')}\n\n`);
  for (const fault of faults) {
    process.stderr.write(`  ${fault.file}\n    [${fault.token}] …${fault.context}…\n`);
  }
  process.exitCode = 1;
} else {
  process.stdout.write(
    `Naming: clean across ${files.length} files (synonyms from CONTEXT.md: ${synonyms.join(', ')}).\n`,
  );
}
