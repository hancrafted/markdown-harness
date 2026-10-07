// Arm derivation. The steered arm substitutes the generated steering-marker
// clause for the committed placeholder; the intent-neutralised arm replaces every
// carrier in the document — tested or not, mandatory ones included, because they
// must stay present — with one constant, content-free filler.
//
// An equal-length filler was rejected: padding would invent readable content. The
// characters each arm delivers are recorded instead.

import { parse, stringify } from 'yaml';
import { intentCarriers } from '../carriers/intent-carriers.pure.ts';
import type { DeliveredCarrier, DeriveArmInput, DerivedArm } from './derived-arm.types.ts';

export const NEUTRAL_FILLER = 'No further guidance applies here.';

type Cursor = Record<string | number, unknown>;

function write(document: unknown, path: readonly (string | number)[], text: string): void {
  const parent = path.slice(0, -1).reduce((node, key) => (node as Cursor)[key], document);
  (parent as Cursor)[path[path.length - 1] as string | number] = text;
}

function read(document: unknown, path: readonly (string | number)[]): string {
  return path.reduce((node, key) => (node as Cursor)[key], document) as string;
}

function substituted(text: string, input: DeriveArmInput): string {
  if (input.arm === 'neutralised') return NEUTRAL_FILLER;
  return text.includes(input.placeholder) ? text.split(input.placeholder).join(input.clause) : text;
}

function delivered(document: unknown): DeliveredCarrier[] {
  return intentCarriers(document).map(({ address, path }) => ({ address, text: read(document, path) }));
}

export function deriveArm(input: DeriveArmInput): DerivedArm {
  const document: unknown = parse(input.configText);
  let substitutions = 0;
  for (const { path } of intentCarriers(document)) {
    const before = read(document, path);
    const after = substituted(before, input);
    if (input.arm === 'steered' && after !== before) substitutions += 1;
    if (after !== before) write(document, path, after);
  }
  if (input.arm === 'steered' && substitutions === 0) {
    throw new Error(`steered arm: placeholder ${input.placeholder} appears in no carrier`);
  }
  const carriers = delivered(document);
  const charactersDelivered = carriers.reduce((sum, carrier) => sum + carrier.text.length, 0);
  return { configText: stringify(document), carriers, substitutions, charactersDelivered };
}
