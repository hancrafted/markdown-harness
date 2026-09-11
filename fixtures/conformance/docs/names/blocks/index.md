# index

<!-- expect: PASSES -->

THE RESERVED-NAME ESCAPE, through a mechanism the language already had. `content-block-names` carries
`excludeFiles: ['**/index.md']`, so the naming Module never selects this file — and it falls through to the
frontmatter Module's `index-files` rule, which forbids frontmatter. It carries none, so it passes.

The file is governed, by exactly one Module, and a reader can see which from the report's `modules` array.
