import { walkTree } from './lib/platform/file-system.impure.ts';

export function listMarkdownFiles(root: string): readonly string[] | undefined {
  return walkTree(root);
}
