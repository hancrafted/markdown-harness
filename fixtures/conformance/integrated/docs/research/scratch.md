---
type: research
---
<!-- expect: FAILS -->

An exclusion belongs to one Module. `frontmatter`'s `research` Rule excludes `scratch.md` and no other Rule of that Module selects it, so the first Module does not govern the file; `body-structure`'s `research` Rule writes no exclusion and governs it. One Module governs a file the other does not, and the file has no description to report.

# Scratch
