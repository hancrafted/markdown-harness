// The intent-carrier walk: every mapping key named `intent` whose value is a
// string, at any depth, addressed by its path from the document root.
//
// Generic by design — it names no Module's section type, so ARCH-008 §1.1 holds
// without a carrier list from each Module.

function walkMapping(mapping: object, address: string, found: string[]): void {
  for (const [key, child] of Object.entries(mapping)) {
    const childAddress = address === '' ? key : `${address}.${key}`;
    if (key === 'intent' && typeof child === 'string') found.push(childAddress);
    else walk(child, childAddress, found);
  }
}

function walk(value: unknown, address: string, found: string[]): void {
  if (Array.isArray(value)) value.forEach((item, index) => walk(item, `${address}[${index}]`, found));
  else if (typeof value === 'object' && value !== null) walkMapping(value, address, found);
}

export function intentCarrierAddresses(document: unknown): string[] {
  const found: string[] = [];
  walk(document, '', found);
  return found;
}
