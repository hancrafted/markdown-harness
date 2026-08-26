# markdown-harness

_Purpose not yet defined — replace this line once the project's scope settles._

Glossary only. Definitions live here; the mechanics of where each record lives and who writes it live in `docs/agents/domain.md`.

## Language

### Decision records

Two decision-record systems run side by side. The frontmatter `type` field is the discriminator, and it is the only signal that survives a file being moved, quoted, or pasted out of context — check it rather than inferring from the directory.

**ADR**:
A governance decision record owned by Archgate. Its frontmatter has no `type` field — it opens with `id:` — which is what marks it as an ADR rather than a design-ADR.
_Avoid_: architecture decision record; bare "decision record" when either kind could be meant

**design-ADR**:
A design decision record owned by the Matt Pocock engineering skills. Its frontmatter opens with `type: design-adr` as the first field, which is what marks it as a design-ADR rather than an ADR.
_Avoid_: ADR, design ADR (unhyphenated), architecture decision record
