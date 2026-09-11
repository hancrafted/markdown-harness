# stray note

<!-- expect: UNGOVERNED -->

Every naming rule in this suite selects a SUBFOLDER of `docs/names/`, so a file sitting directly in it is
selected by none of them, and no frontmatter rule names it either.

Governance is opt-in by path in both Modules at once. `invisible` now means no Module claims the path, which
is a stronger claim than it used to be: a file the frontmatter Module ignores is still visible if a naming
rule names it.
