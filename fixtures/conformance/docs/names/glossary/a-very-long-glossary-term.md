# a very long glossary term

<!-- expect: FAILS -->

25 characters against `maxLength: 20`, so `FILE_NAMES__VALUE_TOO_LONG` fires. Note the address: `file.term`,
the segment's own name, even though there is only one segment. A single-segment rule still addresses its
part by name rather than collapsing to the subject.
