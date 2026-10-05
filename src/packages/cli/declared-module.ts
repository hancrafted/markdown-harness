// The concrete contract types, as derived from the declared Module set.
//
// A root entry point with no classifier that re-exports type declarations and
// nothing else — ARCH-005 §1.3's admitted idiom. The derivation sits in
// `lib/run/declared-module.types.ts`; this address exists so a consumer outside
// `cli` — the Conformance catalog, `cli`'s own tests — can hold the closed
// unions without reaching into this Package's internals.
//
// Every export is named rather than starred, so the public surface stays a
// deliberate list.

export type { DeclaredFaultCode, DeclaredViolationCode } from './lib/run/declared-module.types.ts';
