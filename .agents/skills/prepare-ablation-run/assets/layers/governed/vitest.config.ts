import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['**/*.{test,spec}.ts'],
    // The rules tests ship because the record requires each rule to have one, not
    // because this repository should run them. They cover tooling config, not this
    // codebase, so the suite reports on what was built here and nothing else.
    exclude: [...configDefaults.exclude, '.archgate/**'],
  },
});
