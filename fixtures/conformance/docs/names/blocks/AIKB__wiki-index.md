# AIKB — wiki index

<!-- expect: FAILS -->

Uppercase fails MEMBERSHIP, not form. The category segment declares `allowed` and no `format`, so `AIKB`
is reported as `FILE_NAMES__VALUE_NOT_ALLOWED` rather than as a format mismatch. The Operator's opening
proposal for an uppercase category prefix was rejected against his own corpus: 0 of 8 real files carried
one.

NOTE THE STEM. This case cannot be spelled `AIKB__llm-wiki.md`, because a sibling case is already
`aikb__llm-wiki.md` and this suite must check out on a case-insensitive filesystem — where the two are ONE
file and the second silently overwrites the first. Measured on macOS APFS while writing this suite. The
slug is therefore distinct case-insensitively, and the uppercase category, which is what the case tests, is
untouched. See design-ADR 0005 and issue #51.
