import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const PACKAGE_MANIFEST = join('node_modules', '@hancrafted', 'markdown-harness', 'package.json');

/**
 * Load one compiled skill-runtime entry from the installed markdown-harness package.
 *
 * The skill owns package discovery; product decisions live in the Package once
 * it is available. `undefined` preserves the bootstrap path before installation.
 */
export async function loadRuntime(root, entry) {
  const manifest = join(root, PACKAGE_MANIFEST);
  if (!existsSync(manifest)) return { kind: 'missing-package' };

  const runtime = resolve(dirname(manifest), 'dist', 'packages', 'skill-runtime', `${entry}.js`);
  if (!existsSync(runtime)) return { kind: 'missing-runtime' };
  return { kind: 'loaded', runtime: await import(pathToFileURL(runtime).href) };
}
