// Validation of a written `intent`: blank is `CONFIG_EMPTY_INTENT`, the wrong
// type `CONFIG_INVALID_VALUE`.
//
// Published from this gate-owned Package because the code is the Core's and
// both Modules admit an `intent` in several places; one judgement keeps one
// config from earning two verdicts for the same key (ARCH-008 §1.1).

export { intentFaults } from './lib/config/intent-faults.pure.ts';
