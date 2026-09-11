# aikb — Wiki Notes

<!-- expect: FAILS -->

The category passes and the slug does not. `Wiki-Notes` is not kebab-case, so
`FILE_NAMES__FORMAT_MISMATCH` fires at `file.slug` — and only there. A per-segment address is the whole
reason the violation shape reports `segment` rather than blaming the name as a whole.

The stem avoids a case-only collision with `aikb__llm-wiki.md` for the reason recorded in
`AIKB__wiki-index.md`.
