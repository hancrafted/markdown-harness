<!-- expect: FAILS -->

Findings of different sections come in entry order, then in document order within an entry: the bulleted list under `Prose` is reported before the paragraph under `Ordered`, because the `Prose` entry has the lower index.

## Prose

- A bullet.

## Ordered

A paragraph.
