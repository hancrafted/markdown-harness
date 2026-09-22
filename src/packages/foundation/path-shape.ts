// One spelling for one path, for every caller that reports one.
//
// Published from the gate rather than owned by a Module, and for the reason
// `corpus-membership.ts` records beside it: the normalised spelling is what a
// response ECHOES BACK, so two copies of it are how two Modules end up
// disagreeing about what path the report is even about. With the findings about
// one file nested under several Modules, the path is the key they are joined
// on, and `cli` composes the answer for a path no Module claimed at all — so
// the spelling has to be reachable by something that is not a Module.
//
// It reads no host and touches no filesystem. It is here because it is shared
// vocabulary, not because it is a platform read.

export { normalisePath } from './lib/tree/path-shape.pure.ts';
