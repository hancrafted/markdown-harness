// Arm derivation. The steered arm substitutes each generated steering-marker
// clause for its committed placeholder; the intent-neutralised arm replaces every
// carrier in the document — tested or not, mandatory ones included, because they
// must stay present — with one constant, content-free filler.
//
// An equal-length filler was rejected: padding would invent readable content. The
// characters each arm delivers are recorded instead.

import { parse, stringify } from 'yaml';
import { intentCarriers } from '../carriers/intent-carriers.pure.ts';
import type { DeliveredCarrier, DeriveArmInput, DerivedArm, Substitute } from './derived-arm.types.ts';

export const NEUTRAL_FILLER = 'No further guidance applies here.';

type Cursor = Record<string | number, unknown>;

function writeAtPath(document: unknown, path: readonly (string | number)[], text: string): void {
  const parent = path.slice(0, -1).reduce((node, key) => (node as Cursor)[key], document);
  (parent as Cursor)[path[path.length - 1] as string | number] = text;
}

function readAtPath(document: unknown, path: readonly (string | number)[]): string {
  return path.reduce((node, key) => (node as Cursor)[key], document) as string;
}

function substitute(text: string, one: Substitute): string {
  return text.split(one.placeholder).join(one.clause);
}

function substituted(text: string, input: DeriveArmInput): string {
  if (input.arm === 'neutralised') return NEUTRAL_FILLER;
  return input.substitutes.reduce(substitute, text);
}

function delivered(document: unknown): DeliveredCarrier[] {
  return intentCarriers(document).map(({ address, path }) => ({ address, text: readAtPath(document, path) }));
}

function occurrencesIn(texts: readonly string[], input: DeriveArmInput): number[] {
  return input.substitutes.map((one) => texts.filter((text) => text.includes(one.placeholder)).length);
}

export function deriveArm(input: DeriveArmInput): DerivedArm {
  const document: unknown = parse(input.configText);
  const carrierPaths = intentCarriers(document).map(({ path }) => path);
  const before = carrierPaths.map((path) => readAtPath(document, path));
  const occurrences = occurrencesIn(before, input);
  const missing = input.substitutes.filter((_, index) => occurrences[index] === 0);
  if (input.arm === 'steered' && missing.length > 0) {
    throw new Error(`steered arm: placeholder ${missing[0]?.placeholder} appears in no carrier`);
  }
  carrierPaths.forEach((path, index) => writeAtPath(document, path, substituted(before[index] ?? '', input)));
  const carriers = delivered(document);
  const changed = carriers.filter((carrier, index) => carrier.text !== before[index]).length;
  const substitutions = input.arm === 'steered' ? changed : 0;
  const charactersDelivered = carriers.reduce((sum, carrier) => sum + carrier.text.length, 0);
  return { configText: stringify(document), carriers, substitutions, occurrences, charactersDelivered };
}

/** The address of the carrier whose text holds the placeholder, or undefined when none does. */
export function testedCarrierAddress(configText: string, placeholder: string): string | undefined {
  const document: unknown = parse(configText);
  return intentCarriers(document).find(({ path }) => readAtPath(document, path).includes(placeholder))?.address;
}
