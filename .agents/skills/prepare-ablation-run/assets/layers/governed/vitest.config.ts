import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['**/*.{test,spec}.ts'],
    // The rules tests ship because the record requires them to exist, not because
    // this repository should run them. Collecting them would start this variant on
    // a green baseline the others do not have, so the gate would differ by variant
    // rather than by treatment.
    exclude: [...configDefaults.exclude, '.archgate/**'],
  },
});
