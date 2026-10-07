// The intent-carrier walk: every mapping key named `intent` whose value is a
// string, at any depth, addressed by its path from the document root.
//
// Generic by design — it names no Module's section type, so ARCH-008 §1.1 holds
// without a carrier list from each Module. A list item that is a mapping with a
// string `ruleId` is addressed by that id rather than its position, so an
// address survives a reordered Rule list; every other list item is addressed by
// index, which is how a nested spine is told apart.

import type { IntentCarrier } from './intent-carriers.types.ts';

type PathKey = string | number;

interface Position {
  readonly address: string;
  readonly path: readonly PathKey[];
}

function itemLabel(item: unknown, index: number): string {
  const ruleId = typeof item === 'object' && item !== null ? (item as { ruleId?: unknown }).ruleId : undefined;
  return typeof ruleId === 'string' ? `[ruleId=${ruleId}]` : `[${index}]`;
}

function child(at: Position, key: PathKey, label: string): Position {
  return { address: `${at.address}${label}`, path: [...at.path, key] };
}

function walkMapping(mapping: object, at: Position, found: IntentCarrier[]): void {
  for (const [key, value] of Object.entries(mapping)) {
    const next = child(at, key, at.address === '' ? key : `.${key}`);
    if (key === 'intent' && typeof value === 'string') found.push(next);
    else walk(value, next, found);
  }
}

function walk(value: unknown, at: Position, found: IntentCarrier[]): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => walk(item, child(at, index, itemLabel(item, index)), found));
  } else if (typeof value === 'object' && value !== null) {
    walkMapping(value, at, found);
  }
}

export function intentCarriers(document: unknown): IntentCarrier[] {
  const found: IntentCarrier[] = [];
  walk(document, { address: '', path: [] }, found);
  return found;
}

export function intentCarrierAddresses(document: unknown): string[] {
  return intentCarriers(document).map((carrier) => carrier.address);
}
