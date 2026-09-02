import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import checkFile from 'eslint-plugin-check-file';
import tseslint from 'typescript-eslint';

// --- the suffix vocabulary, as globs -----------------------------------------
//
// Position decides the public surface; the suffix decides the discipline inside.
// A package's root files are its entry points: kebab-case, no suffix, no dot.
// Every file below a package root carries EXACTLY ONE of .pure .impure .types
// .test — no stacking, no escape.
//
// These constants are the single source of the vocabulary. The naming convention
// and the exhaustiveness net below consume the SAME strings, so the two checks
// cannot drift apart.
//
// TWO anchors, and the difference is load-bearing. Governance starts at SRC_ROOT,
// so any file under `src/` that matches no classifier is caught. The classifier
// globs stay at PACKAGES_ROOT because that is where the Package tier physically
// is: ENTRY_POINTS and INTERNALS encode exactly one directory tier, so moving
// them up to `src/` shifts every tier and breaks the check in BOTH directions:
// a stray `src/<folder>/<name>.ts` outside the packages root would read as an
// entry point — a false PASS, hiding it from the net — while a real entry point
// like `src/packages/config-contract/index.ts` would read as an internal and be
// failed for carrying no classifier.
const SRC_ROOT = 'src';
const PACKAGES_ROOT = 'src/packages';
const ENTRY_POINTS = `${PACKAGES_ROOT}/*/*.ts`;
const INTERNALS = `${PACKAGES_ROOT}/*/*/**/*.ts`;
const GOVERNED = `${SRC_ROOT}/**/*.ts`;
const TYPES_FILES = `${SRC_ROOT}/**/*.types.ts`;
const PURE_FILES = `${SRC_ROOT}/**/*.pure.ts`;
const CLASSIFIED = [ENTRY_POINTS, INTERNALS];

// `check-file` matches the value pattern against the basename with the FINAL
// extension stripped — undocumented, so write `*.pure`, never `*.pure.ts`.
// `+([a-z0-9-])` excludes `.`, which is what refuses a stacked suffix.
const ONE_SUFFIX = '+([a-z0-9-]).@(pure|impure|types|test)';

// An exported type declaration lives in *.types.ts. A private local type beside
// its only consumer is better locality, not a violation — hence the
// ExportNamedDeclaration narrowing rather than the bare node type.
// `[source=null]` keeps `export type { X } from './y.types'` legal, which is the
// entry-point re-export idiom.
const EXPORTED_TYPE_DECLARATION = ['TSInterfaceDeclaration', 'TSTypeAliasDeclaration', 'TSEnumDeclaration']
  .map((node) => ({
    selector: `ExportNamedDeclaration > ${node}`,
    message: 'stop: an exported type declaration belongs in *.types.ts.',
  }))
  .concat([
    {
      selector: 'ExportDefaultDeclaration > TSInterfaceDeclaration',
      message: 'stop: an exported type declaration belongs in *.types.ts.',
    },
    {
      selector: "ExportNamedDeclaration[source=null] > ExportSpecifier[exportKind='type']",
      message: 'stop: a local type exported by specifier belongs in *.types.ts.',
    },
    {
      selector: "ExportNamedDeclaration[source=null][exportKind='type'] > ExportSpecifier",
      message: 'stop: a local type exported by specifier belongs in *.types.ts.',
    },
  ]);

// A member is admissible in *.pure.ts iff its result is a function of its
// arguments alone. All of Math except random; Date only with an instant supplied
// AND only through getUTC*, because getFullYear resolves through LocalTime whose
// first step is SystemTimeZoneIdentifier() — an ambient host read.
//
// toString/toDateString/toTimeString are deliberately absent: they collide with
// Object.prototype and over-fire on arrays, strings and domain objects. The
// toLocale* family stays — it reads the locale on every built-in that has it.
const LOCAL_TIME_ACCESSORS = [
  'getFullYear',
  'getMonth',
  'getDate',
  'getDay',
  'getHours',
  'getMinutes',
  'getSeconds',
  'getMilliseconds',
  'getTimezoneOffset',
  'toLocaleString',
  'toLocaleDateString',
  'toLocaleTimeString',
];

// These ban the EVASION rather than the call, because the call through an alias
// is not reachable by a single-file selector. The one hole no core rule closes
// is an import: `import { now } from './clock'` defeats every selector.
// The three ambient reads that are nondeterministic wherever they appear. Shared
// by *.pure.ts and **/*.test.ts so the two can never disagree about what a
// nondeterministic source is. The LOCAL_TIME_ACCESSORS above are NOT shared:
// they are a time-zone concern, and a test reading getFullYear off a Date built
// from a fixed instant is perfectly deterministic.
const NONDETERMINISTIC_SOURCES = [
  { object: 'Math', property: 'random', message: 'stop: nondeterministic — pass the value in.' },
  { object: 'Date', property: 'now', message: 'stop: reads the clock — pass the instant in.' },
  { object: 'performance', property: 'now', message: 'stop: reads a clock.' },
];

const DETERMINISM = [
  {
    selector: "NewExpression[callee.name='Date'][arguments.length=0]",
    message: 'stop: new Date() reads the clock — new Date(instant) is admissible.',
  },
  {
    selector: "NewExpression[callee.name='Date'] > SpreadElement",
    message: 'stop: a spread into Date() hides the arity — pass the instant.',
  },
  { selector: "MemberExpression[object.name='Math'][computed=true]", message: 'stop: computed Math access.' },
  { selector: "MemberExpression[object.name='globalThis']", message: 'stop: globalThis reaches the host.' },
  { selector: "VariableDeclarator[init.name='Math']", message: 'stop: aliasing Math.' },
  { selector: "VariableDeclarator[init.name='Date']", message: 'stop: aliasing Date.' },
  {
    selector: "CallExpression[callee.object.name='Reflect'][callee.property.name='construct']",
    message: 'stop: Reflect.construct reaches a banned constructor.',
  },
];

// A test result is evidence about the code: green must mean the test COULD have
// gone red, and red must mean the code changed. Each selector below kills one way
// of breaking that.
//
// TEST_CALL must match every call form or the bans leak. The naive
// `[callee.name=/^(it|test)$/]` misses BOTH `it.only(...)` (callee is a
// MemberExpression) and `it.each([...])(...)` (callee is itself a CallExpression),
// and `it.each` is in active use in this repo.
const TEST_CALL =
  'CallExpression:matches([callee.name=/^(it|test)$/],[callee.object.name=/^(it|test)$/],' +
  '[callee.callee.name=/^(it|test)$/],[callee.callee.object.name=/^(it|test)$/])';

const TEST_BEHAVIOUR = [
  {
    // `expect(x).toBe(y)` nests a CallExpression whose callee IS `expect`; the
    // `callee.object.name` arm catches `expect.soft(...)` and friends.
    selector:
      `${TEST_CALL} > :matches(ArrowFunctionExpression,FunctionExpression)` +
      ":not(:has(CallExpression[callee.name='expect'],CallExpression[callee.object.name='expect']))",
    message: 'stop: a test with no expect could not have gone red.',
  },
  {
    // `.todo` stays legal: it declares intent and cannot turn a red build green.
    selector: 'MemberExpression[object.name=/^(it|test|describe)$/][property.name=/^(only|skip)$/]',
    message: 'stop: .only hides the rest of the suite and .skip turns red green — use .todo to declare intent.',
  },
  {
    selector: 'CallExpression[callee.property.name=/Snapshot$/]',
    message: 'stop: a snapshot freezes whatever the code currently prints — state the expected value.',
  },
  {
    selector:
      'CallExpression[callee.object.name=/^(vi|jest)$/][callee.property.name=/^(mock|doMock|spyOn|mocked|stubGlobal)$/]',
    message: 'stop: a mock asserts against your own stub — exercise the real thing through its entry point.',
  },
];

// --- the structural regime, under `src/` only ---------------------------------
//
// A suite splits into exactly three named blocks, a test body reads in three
// marked steps, and neither is decided by taste. The scope is DELIBERATELY
// narrower than the behavioural bans above: those hold everywhere a test file
// sits, these hold only under `src/`. The sibling tests of ADR rules files are
// exempt — they exercise a rule function against a hand-built double, where a
// three-way split is ceremony rather than evidence.
const SRC_TESTS = 'src/**/*.test.ts';

// Exactly three names. No fourth is admitted: the moment one exists it becomes
// the drawer every ambiguous case goes into, and the split stops forcing the
// question it exists to force.
const SUITE_NAMES = ['success cases', 'failure cases', 'edge cases'];
const NAMED_BLOCK = `/^(${SUITE_NAMES.join('|')})$/`;

const DESCRIBE = "CallExpression[callee.name='describe']";

// One list, two consumers: the esquery string below and the runtime check in the
// local rule. Spelling it twice is how they drift apart.
const CALLBACK_TYPES = ['ArrowFunctionExpression', 'FunctionExpression'];
const CALLBACK = `:matches(${CALLBACK_TYPES.join(',')})`;

// Two traps, both hit while verifying these against a real suite.
//
// 1. `:has()` here matches SELF OR DESCENDANT, so `DESCRIBE:has(DESCRIBE)` is
//    equivalent to `DESCRIBE` and silently passes everything. Every check below
//    therefore anchors on the describe's CALLBACK, which can never satisfy the
//    inner selector itself.
// 2. The must-split check has to anchor at `Program > ExpressionStatement`, or it
//    fires on the three inner blocks too — they hold tests and no nested
//    describe by construction, which is exactly the shape it looks for.
const SUITE_STRUCTURE = [
  {
    selector: `Program > ExpressionStatement > ${TEST_CALL}`,
    message: `stop: a test at file top level sits in no named block — put it in ${SUITE_NAMES.join(', ')}.`,
  },
  {
    selector: `${DESCRIBE} ${DESCRIBE} ${DESCRIBE}`,
    message: 'stop: three levels of describe — the split is one level deep, so two is the maximum.',
  },
  {
    selector: `${DESCRIBE} ${DESCRIBE}:not([arguments.0.value=${NAMED_BLOCK}])`,
    message: `stop: an inner describe must be named ${SUITE_NAMES.join(', ')} — there is no fourth name.`,
  },
  ...SUITE_NAMES.map((name) => ({
    selector: `${DESCRIBE} > ${CALLBACK}:has(${DESCRIBE}):not(:has(${DESCRIBE}[arguments.0.value='${name}']))`,
    message: `stop: this suite has no \`${name}\` block. All three are mandatory, with at least one test in each — an empty one is the point, because it surfaces the assertion nobody wrote.`,
  })),
  {
    selector: `Program > ExpressionStatement > ${DESCRIBE} > ${CALLBACK}:has(${TEST_CALL}):not(:has(${DESCRIBE}))`,
    message: `stop: a top-level suite must split into ${SUITE_NAMES.join(', ')}.`,
  },
];

// `no-restricted-syntax` CANNOT SEE COMMENTS — verified against `Line`,
// `Comment` and `Line[value=/ARRANGE/]`, none of which match a marked body,
// because esquery walks the AST and comments are not in it. The markers and the
// magic-value ban therefore need `sourceCode`, which is what the rule below is
// for. It is a plain object rather than a package: flat config accepts an inline
// plugin, so this costs no dependency and clears no admission bar.
//
// AAA rather than Given-When-Then: published vendor testing guidance names the
// Arrange-Act-Assert pattern explicitly, and it is denser in TypeScript and
// vitest training data — which is the property that matters when the reader is a
// model.
const AAA_MARKERS = ['ARRANGE', 'ACT', 'ASSERT'];

// Naming these in the arrange block would make a test harder to read, not
// easier, so the ban exempts them. `-1` needs no entry: it tokenises as `-`
// followed by `1`. `true`, `false`, `null`, `undefined`, `[]` and `{}` need none
// either — none of them is a String or Numeric token.
const EXEMPT_TOKENS = new Set(['0', '1', "''", '""']);

/** Where each AAA marker sits in one test body, keyed by marker, in source order. */
function markerComments(context, body) {
  const found = new Map(AAA_MARKERS.map((marker) => [marker, []]));
  for (const comment of context.sourceCode.getCommentsInside(body)) {
    found.get(comment.value.trim())?.push(comment);
  }
  return found;
}

/** Report a missing, duplicated or out-of-order marker. True if the body is unreadable. */
function reportMarkers(context, node, found) {
  const wrongCount = [...found].filter(([, comments]) => comments.length !== 1);
  for (const [marker, comments] of wrongCount) {
    context.report({ node, messageId: 'marker', data: { marker, count: String(comments.length) } });
  }
  if (wrongCount.length > 0) return true;
  const at = AAA_MARKERS.map((marker) => found.get(marker)[0].range[0]);
  if (at[0] < at[1] && at[1] < at[2]) return false;
  context.report({ node, messageId: 'order' });
  return true;
}

/** True for a literal a reader would have to look up rather than a name they can check. */
function isMagicToken(token) {
  if (token.type === 'String' || token.type === 'Numeric') return !EXEMPT_TOKENS.has(token.value);
  // A `Template` token is one CHUNK of a template literal, so quote style alone
  // would otherwise defeat the ban: `expect(x).toBe(`not found`)` tokenises as
  // Template, never String. A chunk that both opens and closes with a backtick IS
  // the whole literal, which means it carries no interpolation and is a plain
  // string in different quotes. Chunks of an INTERPOLATED template are left
  // alone: those hold named values, which is what the rule is asking for.
  if (token.type !== 'Template') return false;
  return token.value.length > 2 && /^`[\s\S]*`$/.test(token.value);
}

/** Report every magic value after `from`, which is the end of the ASSERT marker. */
function reportMagicValues(context, body, from) {
  for (const token of context.sourceCode.getTokens(body)) {
    if (token.range[0] < from) continue;
    if (!isMagicToken(token)) continue;
    context.report({ loc: token.loc, messageId: 'magic', data: { value: token.value } });
  }
}

const testBodyAaa = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'A test body carries // ARRANGE, // ACT and // ASSERT in that order, and names its expected values before asserting them.',
    },
    schema: [],
    messages: {
      marker:
        'stop: this test body needs `// {{ marker }}` exactly once, found {{ count }} — the three markers are what let a body be read in one pass.',
      order: 'stop: the markers must read // ARRANGE, then // ACT, then // ASSERT.',
      magic:
        'stop: {{ value }} is a magic value in the assert block — name it in // ARRANGE, so a reader can disagree with it.',
    },
  },
  create(context) {
    return {
      [TEST_CALL](node) {
        const body = node.arguments.find((argument) => CALLBACK_TYPES.includes(argument.type));
        if (!body) return; // `it.each([...])` matches too: that call is the table, not the test
        const found = markerComments(context, body);
        if (reportMarkers(context, node, found)) return;
        reportMagicValues(context, body, found.get('ASSERT')[0].range[1]);
      },
    };
  },
};

// One plugin object, two consumers. Flat config throws on a plugin namespace
// redefined with a DIFFERENT object, so the two blocks that enable this rule
// must SHARE this reference rather than each spelling the literal out.
const localPlugin = { local: { rules: { 'test-body-aaa': testBodyAaa } } };

export default tseslint.config(
  // `.archgate/` is ignored file-by-file rather than as a subtree. An ADR's
  // `.rules.ts` runs inside archgate's own sandbox against its own ambient types,
  // not this project's build, so linting it means importing rules it was never
  // written against. Its TESTS are ordinary vitest files and must be reachable:
  // four of this repo's six test files live here, and an ADR naming an enforcer
  // that cannot see the file it governs is exactly the silent non-governance
  // `src/packages/AGENTS.md` exists to close.
  //
  // Written as two precise patterns because a subtree ignore cannot be undone —
  // ESLint refuses to unignore a file inside an ignored directory, so the
  // `!.archgate/**/*.rules.test.ts` spelling silently keeps the tests invisible.
  // `*.rules.ts` does not match `*.rules.test.ts`, which is what splits them.
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'coverage/**',
      '.claude/worktrees/**',
      '.worktrees/**',
      '.archgate/**/*.rules.ts',
      '.archgate/rules.d.ts',
    ],
  },
  {
    files: ['**/*.ts'],
    extends: [js.configs.recommended, tseslint.configs.recommended, tseslint.configs.stylistic],
    rules: {
      complexity: ['error', 7],
      'max-lines-per-function': ['error', 30],
      'max-params': ['error', 3],
      'max-depth': ['error', 3],
      'max-lines': ['error', 250],
    },
  },
  {
    files: ['**/*.test.ts'],
    rules: { 'max-lines-per-function': 'off', 'max-lines': 'off' },
  },

  // Exactly one classifier per file, enforced by name.
  {
    files: [GOVERNED],
    plugins: { 'check-file': checkFile },
    rules: {
      'check-file/filename-naming-convention': [
        'error',
        { [ENTRY_POINTS]: 'KEBAB_CASE', [INTERNALS]: ONE_SUFFIX },
        {
          errorMessage:
            'stop: "{{ target }}" does not match "{{ pattern }}". A package root file is kebab-case with no suffix; every file below it carries exactly one of .pure .impure .types .test.',
        },
      ],
    },
  },

  // Flat config OVERRIDES rule options rather than merging them, so every block
  // below that sets no-restricted-syntax states the complete list for the files
  // it matches. Order is load-bearing: later blocks win.
  {
    files: [GOVERNED],
    ignores: [TYPES_FILES],
    rules: { 'no-restricted-syntax': ['error', ...EXPORTED_TYPE_DECLARATION] },
  },
  {
    files: [PURE_FILES],
    rules: {
      'no-restricted-syntax': ['error', ...EXPORTED_TYPE_DECLARATION, ...DETERMINISM],
      'no-restricted-properties': [
        'error',
        ...NONDETERMINISTIC_SOURCES,
        ...LOCAL_TIME_ACCESSORS.map((property) => ({
          property,
          message: 'stop: reads the host time zone — use the getUTC* accessor.',
        })),
      ],
    },
  },

  // Every test file in the repo, wherever it sits. This block RESTATES
  // EXPORTED_TYPE_DECLARATION because flat config overrides rather than merges:
  // omitting it would silently disarm the type-declaration ban on package tests.
  //
  // Its position is load-bearing in both directions. It must come AFTER the
  // GOVERNED and *.pure.ts blocks so it wins for test files, and BEFORE the
  // exhaustiveness net so it does not win for a stray `src/packages/x.test.ts`
  // that matches no classifier — that file must still hit the net.
  {
    files: ['**/*.test.ts'],
    rules: {
      'no-restricted-syntax': ['error', ...EXPORTED_TYPE_DECLARATION, ...DETERMINISM, ...TEST_BEHAVIOUR],
      'no-restricted-properties': ['error', ...NONDETERMINISTIC_SOURCES],
    },
  },

  // The structural regime. Narrower than the block above on purpose, and it must
  // come AFTER it: flat config overrides `no-restricted-syntax` rather than
  // merging it, so this block restates the behavioural bans it inherits nothing
  // of. It stays BEFORE the exhaustiveness net for the same reason that block
  // does — a stray `src/packages/x.test.ts` matching no classifier must still
  // reach the net's message rather than this one's.
  //
  // `no-restricted-properties` is deliberately NOT restated: nothing here changes
  // it, and an unset rule keeps the value the earlier block gave it.
  {
    files: [SRC_TESTS],
    plugins: localPlugin,
    rules: {
      'no-restricted-syntax': [
        'error',
        ...EXPORTED_TYPE_DECLARATION,
        ...DETERMINISM,
        ...TEST_BEHAVIOUR,
        ...SUITE_STRUCTURE,
      ],
      'local/test-body-aaa': 'error',
    },
  },

  // Two base rules that are wrong for an ADR's sibling test, disabled narrowly
  // rather than by re-hiding the files. Both were surfaced the moment these tests
  // became visible, and both describe correct code:
  //
  // - the triple-slash reference is how archgate supplies its ambient RuleContext
  //   types; `import` is not an alternative, because there is nothing to import.
  // - the empty `warning`/`info` sinks on the hand-built RuleContext double are
  //   the behaviour under test — the double collects violations and discards the
  //   rest, so an empty body is the honest spelling.
  //
  // Disabled here rather than with `eslint-disable-next-line` at each of the ~12
  // sites, which would be narrower but wrong twice over: it edits test files to
  // satisfy the linter, and it spends inline suppression — a mechanism this
  // project deliberately keeps unspent — on constructs that are not exceptions
  // at all. Both rules stay live everywhere else.
  //
  // The body regime is enabled here too, and DELIBERATELY WITHOUT
  // SUITE_STRUCTURE. `ARCH-003` exempts these files from the three-way split — a
  // rules test drives one rule function against a hand-built double — while
  // still requiring the marked body. Held behind `files: [SRC_TESTS]`, that
  // second half promised a reach no enforcer had. The record is named by id and
  // never by section number: its numbering moves whenever it is rewritten, and a
  // coordinate that has gone stale reads as authority. `no-restricted-syntax` is
  // deliberately NOT restated: an unset rule keeps the value the `**/*.test.ts`
  // block gave it, so the behavioural bans stay live and the structural ones
  // never arrive.
  {
    files: ['.archgate/**/*.rules.test.ts'],
    plugins: localPlugin,
    rules: {
      '@typescript-eslint/triple-slash-reference': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      'local/test-body-aaa': 'error',
    },
  },

  // The exhaustiveness net. `check-file` checks only the files its keys select
  // and reports nothing for a file matching no key, so a file that matches no
  // glob would load no ADR and be silently ungoverned. This block reuses
  // CLASSIFIED verbatim, so it closes over exactly what the vocabulary admits.
  // It is last, so one clear message wins over the type-declaration ban.
  {
    files: [GOVERNED],
    ignores: CLASSIFIED,
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Program',
          message:
            'stop: this file sits outside src/packages/<package>/ and no ADR governs it. Move it into a package, or open a needs-triage issue.',
        },
      ],
    },
  },

  eslintConfigPrettier,
);
