import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['**/*.{test,spec}.ts'],
    // Sibling git worktrees under .worktrees/ hold their own full checkout,
    // including their own copies of these very test files. Without this, verify
    // in one checkout runs another branch's suite — and asserts that branch's
    // ADR contract. The include glob is deliberately greedy, so the guard
    // belongs here rather than there.
    exclude: [...configDefaults.exclude, '.worktrees/**'],
    coverage: {
      provider: 'v8',
    },
  },
});
