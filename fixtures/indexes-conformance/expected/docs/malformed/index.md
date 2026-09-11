---
description: A damaged marker that is not ours to delete.
---

# Malformed

The comment below is spelled `<!--indexes:start-->` — no spaces, different bytes. It is never
recognised, so it is never a boundary and never deleted: removing it would mean judging whether
it is a typo of ours or an unrelated comment, and that is a judgement the generator does not
make. It is a self-closing comment, so it renders invisibly and harms nothing.

<!--indexes:start-->

Because no pair is recognised in this file, a fresh pair is appended at the end of it.

<!-- indexes:start -->
<!-- generated, do not edit; run `mh indexes generate` to update -->

- [note](note.md) - One entry, so the appended region has something in it.

<!-- indexes:end -->
