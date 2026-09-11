# aikb — llm wiki

<!-- expect: PASSES -->

The happy path, and the name the whole design was priced against. The stem splits on `__` into exactly
two non-empty parts: `aikb` is in the category's closed set, and `llm-wiki` is kebab-case, 8 characters,
inside the 3..50 bound. Nothing is reported, and the file is counted in `governedFiles`.
