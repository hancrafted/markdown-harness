---
name: legacy
title: Legacy
description: Carries both names.
---

# Legacy

One file, two entries, two different text rules — and no other fixture exercises that.

In `docs/skills/legacy/index.md` this file is a FILE entry, so its link text is read from
frontmatter and `title` wins: the entry reads `Legacy`.

In `docs/skills/index.md` this same file supplies the description for the `legacy/` FOLDER
entry, where the link text is the folder name and only the description is read from here: the
entry reads `legacy`.
