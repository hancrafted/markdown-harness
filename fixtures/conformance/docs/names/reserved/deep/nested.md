# nested

<!-- expect: UNGOVERNED -->

A SINGLE-STAR GLOB REACHES ONE LEVEL. `reserved-stem-names` selects `docs/names/reserved/*.md`, which does
not cross a `/`, so this file one level deeper is unselected — and no frontmatter rule names it either.

Both Modules pass it by, so it is invisible: never read, never reported, never counted. The faults a reader
might see in this name are real and may never be reported, which is the whole of what this case tests.
