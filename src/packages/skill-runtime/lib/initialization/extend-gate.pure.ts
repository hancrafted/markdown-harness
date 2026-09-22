/** Append the check command only when the selected package script does not already contain it. */
export function extendGate(existing: string, check: string): string {
  return existing.includes(check) ? existing : `${existing} && ${check}`;
}
