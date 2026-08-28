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

export default tseslint.config(
  { ignores: ['node_modules/**', 'dist/**', 'coverage/**', '.archgate/**'] },
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
        { object: 'Math', property: 'random', message: 'stop: nondeterministic — pass the value in.' },
        { object: 'Date', property: 'now', message: 'stop: reads the clock — pass the instant in.' },
        { object: 'performance', property: 'now', message: 'stop: reads a clock.' },
        ...LOCAL_TIME_ACCESSORS.map((property) => ({
          property,
          message: 'stop: reads the host time zone — use the getUTC* accessor.',
        })),
      ],
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
