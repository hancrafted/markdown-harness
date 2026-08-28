import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['**/*.{test,spec}.ts'],
    // Git worktrees hold their own full checkout, including their own copies of
    // these very test files. Without this, verify in one checkout runs another
    // branch's suite — and asserts that branch's ADR contract. The include glob
    // is deliberately greedy, so the guard belongs here rather than there.
    //
    // Two locations, because they are created by different hands: `.worktrees/`
    // by a human, `.claude/worktrees/` by a Host harness isolating an agent.
    // Only the first was listed, so an agent worktree was silently in scope.
    exclude: [...configDefaults.exclude, '.worktrees/**', '.claude/worktrees/**'],
    coverage: {
      provider: 'v8',
    },
  },
});
