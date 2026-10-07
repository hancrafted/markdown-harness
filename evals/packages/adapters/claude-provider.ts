// The provider the eval tool loads by path. Its default export is a class defined
// in an impure file below this root, which ARCH-004 allows: only a barrel
// re-exporting a whole subtree is forbidden.
import ClaudeCodeProvider from './lib/provider/claude-provider.impure.ts';

export default ClaudeCodeProvider;
