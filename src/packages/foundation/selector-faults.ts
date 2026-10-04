// Selector validation: the selector half of one Rule on Core's two literal
// axes, and the two fault shapes every section validator raises.
//
// Published from this gate-owned Package because two Modules validate the same
// selector language and neither may import the other (ARCH-008 §1.1). A Module
// with an axis of its own passes it in; the Core never names it (design-ADR
// 0007, 0012). design-ADR 0022 amends the design-ADR 0020 point that restating
// this per Module was deliberate.

export {
  axisFaults,
  exclusionFaults,
  invalidValue,
  isStringList,
  selectorMissingFaults,
  tokenFaults,
  unrecognisedKeys,
} from './lib/config/selector-faults.pure.ts';
