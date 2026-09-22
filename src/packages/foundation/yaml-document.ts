// Published from this gate-owned Package for the same reason `read-text.ts`
// and `corpus-membership.ts` are: two callers — the config loader here in
// foundation and frontmatter-harness's own reader — used to each hand-roll
// "bytes in, mapping fault out" byte-identically, and a second copy is how
// two Modules end up disagreeing about what counts as a mapping without
// either one meaning to. `isMapping` ships from the same entry point because
// it is the narrowing this parse rests on, and it is also the one several
// fault-reporting call sites elsewhere in the tool narrow already-parsed YAML
// against directly, with no parse of their own.
//
// `EmptyDocumentPolicy` is exported rather than defaulted inside this file:
// the two existing readers disagree on what an empty document means, and that
// disagreement is a caller decision this entry point hands back rather than
// one it makes.

export { parseYamlDocument } from './lib/yaml/yaml-document.pure.ts';
export type { EmptyDocumentPolicy, YamlDocumentResult } from './lib/yaml/yaml-document.types.ts';
export { isMapping } from './lib/yaml/yaml-mapping.pure.ts';
