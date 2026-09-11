---
description: |
  This description holds a literal line break.
  An entry is one line, so a copy of it cannot be one.
---

# Multiline

A `|` literal block parses to a string carrying `\n`. An entry is a single list item, and a
second line beginning `-` or `#` would start a new block inside the region.

Note the contrast with a `>-` folded block, which parses to a single line and copies clean. The
rule is about the PARSED string, never about the source bytes — which is why "copied byte for
byte" means byte for byte out of the parser, not out of the file.
