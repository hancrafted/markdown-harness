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
// These four constants are the single source of the vocabulary. The naming
// convention and the exhaustiveness net below consume the SAME strings, so the
// two checks cannot drift apart. Phase 5 of #2 repoints PACKAGES_ROOT-derived
// globs at `src/` once `src/config/` has moved into the tree.
const PACKAGES_ROOT = 'src/packages';
const ENTRY_POINTS = `${PACKAGES_ROOT}/*/*.ts`;
const INTERNALS = `${PACKAGES_ROOT}/*/*/**/*.ts`;
const GOVERNED = `${PACKAGES_ROOT}/**/*.ts`;
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

export default tseslint.config(
  // `.archgate/` is ignored file-by-file rather than as a subtree. An ADR's
  // `.rules.ts` runs inside archgate's own sandbox against its own ambient types,
  // not this project's build, so linting it means importing rules it was never
  // written against. Its TESTS are ordinary vitest files and must be reachable:
  // four of this repo's six test files live here, and an ADR naming an enforcer
  // that cannot see the file it governs is exactly the silent non-governance
  // `src/packages/README.md` exists to close.
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
    ignores: [`${PACKAGES_ROOT}/**/*.types.ts`],
    rules: { 'no-restricted-syntax': ['error', ...EXPORTED_TYPE_DECLARATION] },
  },
  {
    files: [`${PACKAGES_ROOT}/**/*.pure.ts`],
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
  {
    files: ['.archgate/**/*.rules.test.ts'],
    rules: {
      '@typescript-eslint/triple-slash-reference': 'off',
      '@typescript-eslint/no-empty-function': 'off',
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
