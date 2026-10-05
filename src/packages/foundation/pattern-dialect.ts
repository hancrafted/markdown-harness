// The config's one regex dialect: a `pattern` built with the `u` flag and no
// other, and whether one compiles in it.
//
// Published from this gate-owned Package because both Modules read `pattern`
// in the same config and neither may import the other (ARCH-008 §1.1). One
// builder is what keeps the dialect one: load validates in it, check searches
// with it.

export { compiles, dialectPattern } from './lib/config/pattern-dialect.pure.ts';
