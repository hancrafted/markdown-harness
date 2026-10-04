// Where a file's frontmatter block starts and ends, and where its body begins.
//
// Published from this gate-owned Package because two Modules read it and
// neither may import the other (ARCH-008 §1.1). `frontmatter-harness` parses
// the block; `body-structure-harness` reads the block's `type` and lexes the
// body after it. One copy of the fence rule is what keeps them agreeing about
// where a block ends: two copies are how a `# comment` inside YAML ends up
// counted as a title by one Module and as a comment by the other.
//
// Moved here from `frontmatter-harness` (design-ADR 0014, consequence 1). The
// fence rule is unchanged; the answer gains a `body` field beside the fields it
// already had, which `frontmatter-harness` never reads. The `frontmatter`
// Conformance tier is the proof that the move changed no byte of that Module's
// behaviour.

export { frontmatterBlock } from './lib/frontmatter/frontmatter-block.pure.ts';
