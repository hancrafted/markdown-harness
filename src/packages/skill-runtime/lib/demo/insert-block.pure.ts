/** Insert a marked demo Rule directly below `rules:`, preserving all other bytes. */
export function insertDemoBlock(config: string, block: string): string | undefined {
  const lines = config.split('\n');
  const at = lines.findIndex((line) => /^\s*rules:\s*$/.test(line));
  if (at === -1) return undefined;
  lines.splice(at + 1, 0, block);
  return lines.join('\n');
}

/** Remove one complete marked demo block without touching the surrounding configuration. */
export function removeDemoBlock(config: string): { text: string; found: boolean } {
  const lines = config.split('\n');
  const from = lines.findIndex((line) => line.trim() === '# --- BEGIN markdown-harness demo ---');
  if (from === -1) return { text: config, found: false };

  const to = lines.findIndex((line, index) => index > from && line.trim() === '# --- END markdown-harness demo ---');
  if (to === -1) return { text: config, found: false };

  lines.splice(from, to - from + 1);
  return { text: lines.join('\n'), found: true };
}
