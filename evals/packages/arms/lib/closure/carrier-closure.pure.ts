// The closure over tested carriers, computed by evaluating the config: parse the
// YAML and walk its strings, never grep it (trap 4). Every placeholder the config
// holds must be declared by its case, and every placeholder a case declares must
// resolve to exactly one intent carrier. A placeholder is also refused when it
// sits in a string that is not a carrier (the derived config would keep it), and
// when one declared placeholder contains another (substitution would corrupt it).

import { parse } from 'yaml';
import { intentCarriers } from '../carriers/intent-carriers.pure.ts';

const SHAPE = /\b[A-Z][A-Z0-9_]*PLACEHOLDER[A-Z0-9_]*\b/g;

type Path = readonly (string | number)[];

interface Leaf {
  readonly path: Path;
  readonly text: string;
}

function collect(value: unknown, path: Path, found: Leaf[]): void {
  if (typeof value === 'string') found.push({ path, text: value });
  else if (typeof value === 'object' && value !== null)
    for (const [key, child] of Object.entries(value)) collect(child, [...path, key], found);
}

/** A path as one string, so a list index (a number in the carrier walk, a string here) compares equal. */
function keyOf(path: Path): string {
  return path.map(String).join('\u0000');
}

function tokensOf(text: string): string[] {
  return [...new Set(text.match(SHAPE) ?? [])];
}

interface Evaluated {
  /** Each placeholder token, with the address of every carrier that holds it. */
  readonly inCarriers: ReadonlyMap<string, readonly string[]>;
  /** Tokens found in a string that is not an intent carrier. */
  readonly elsewhere: readonly string[];
}

function evaluate(configText: string): Evaluated {
  const document: unknown = parse(configText);
  const leaves: Leaf[] = [];
  collect(document, [], leaves);
  const carriers = new Map(intentCarriers(document).map((carrier) => [keyOf(carrier.path), carrier.address]));
  const inCarriers = new Map<string, string[]>();
  const elsewhere: string[] = [];
  for (const leaf of leaves) {
    const address = carriers.get(keyOf(leaf.path));
    for (const token of tokensOf(leaf.text)) {
      if (address === undefined) elsewhere.push(token);
      else inCarriers.set(token, [...(inCarriers.get(token) ?? []), address]);
    }
  }
  return { inCarriers, elsewhere };
}

/** The distinct placeholder tokens the config holds in its intent carriers. */
export function placeholdersIn(configText: string): string[] {
  return [...evaluate(configText).inCarriers.keys()].sort();
}

function undeclared(seen: Evaluated, declared: readonly string[]): string[] {
  return [...seen.inCarriers]
    .filter(([token]) => !declared.includes(token))
    .map(([token, at]) => `placeholder ${token} is in ${at.join(', ')} and no case declares it`);
}

function unresolved(seen: Evaluated, declared: readonly string[]): string[] {
  return declared
    .filter((token) => !seen.inCarriers.has(token))
    .map((token) => `declared placeholder ${token} is in no intent carrier`);
}

function ambiguous(seen: Evaluated): string[] {
  return [...seen.inCarriers]
    .filter(([, at]) => at.length > 1)
    .map(([token, at]) => `placeholder ${token} is in ${at.length} carriers, so its steering marker would occur twice`);
}

function overlapping(declared: readonly string[]): string[] {
  return declared.flatMap((outer) =>
    declared
      .filter((inner) => inner !== outer && outer.includes(inner))
      .map((inner) => `declared placeholder ${outer} contains declared placeholder ${inner}`),
  );
}

/** Every way the config and its case's declarations disagree; empty means closed. */
export function carrierClosure(configText: string, declared: readonly string[]): string[] {
  const seen = evaluate(configText);
  return [
    ...undeclared(seen, declared),
    ...unresolved(seen, declared),
    ...ambiguous(seen),
    ...seen.elsewhere.map((token) => `placeholder ${token} sits in a string that is not an intent carrier`),
    ...overlapping(declared),
  ];
}
