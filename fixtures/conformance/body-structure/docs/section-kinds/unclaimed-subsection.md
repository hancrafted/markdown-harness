<!-- expect: PASSES -->

A section is the blocks between a heading and the next heading of any level, so `Prose`’s section ends at `Details`. `Details` is claimed by no entry and its section is judged by nobody, even though its parent lists only `prose`: a parent’s `mayHold` never reaches into a subsection.

## Prose

A paragraph.

### Details

- A bullet.
- Another.
