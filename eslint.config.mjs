import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

/**
 * Tenet 3: the check path is hermetic — no network, no model, no external
 * service, no git call, and the same tree in gives the same result out.
 *
 * All I/O sits at the caller's edge: `src/cli.ts` is root code and the only
 * file in the repo that touches disk. This block is what makes that structural
 * rather than a convention, and it is also the cash value of tenet 4 — a
 * reimplementation is verified by feeding a port the same JSON values, with no
 * filesystem semantics to reverse-engineer.
 *
 * A package's `tests/` folder is exempt: a test plays the role `cli.ts` plays,
 * reading the fixture corpus and handing the values across the seam.
 */
const HERMETIC_PACKAGES = {
  files: ['src/packages/**/*.ts'],
  ignores: ['src/packages/*/tests/**'],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        paths: [
          { name: 'node:fs', message: 'I/O belongs in src/cli.ts. A package receives values, never a path to read.' },
          {
            name: 'node:fs/promises',
            message: 'I/O belongs in src/cli.ts. A package receives values, never a path to read.',
          },
          { name: 'node:process', message: 'argv, env and cwd are the caller’s edge: src/cli.ts.' },
          { name: 'node:child_process', message: 'Tenet 3: no git call, no external service. Nothing shells out.' },
          { name: 'node:http', message: 'Tenet 3: the check path makes no network call.' },
          { name: 'node:https', message: 'Tenet 3: the check path makes no network call.' },
          { name: 'node:net', message: 'Tenet 3: the check path makes no network call.' },
          { name: 'node:dns', message: 'Tenet 3: the check path makes no network call.' },
        ],
      },
    ],
    'no-restricted-globals': [
      'error',
      { name: 'process', message: 'argv, env and cwd are the caller’s edge: src/cli.ts.' },
      { name: 'fetch', message: 'Tenet 3: the check path makes no network call.' },
    ],
    'no-restricted-properties': [
      'error',
      {
        object: 'Date',
        property: 'now',
        message: 'Tenet 3: no clock. `format: datetime` checks form, never freshness.',
      },
      { object: 'Math', property: 'random', message: 'Tenet 3: the same tree in gives the same result out.' },
    ],
    'no-restricted-syntax': [
      'error',
      {
        selector: "NewExpression[callee.name='Date']",
        message: 'Tenet 3: no clock. `format: datetime` checks form, never freshness.',
      },
    ],
  },
};

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
  HERMETIC_PACKAGES,
  {
    files: ['**/*.test.ts'],
    rules: { 'max-lines-per-function': 'off', 'max-lines': 'off' },
  },
  eslintConfigPrettier,
);
