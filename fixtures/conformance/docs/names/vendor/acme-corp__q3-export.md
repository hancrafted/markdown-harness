# acme corp — q3 export

<!-- expect: FAILS -->

The same name with the vendor token spelled in kebab-case instead of the vendor's own
spelling. `acme-corp` is outside the closed set, so `FILE_NAMES__VALUE_NOT_ALLOWED` fires at
`file.vendor`.

The pair matters: a closed set is the one constraint that can carry a token this language
would otherwise have no way to spell, and the delimiter does not interfere with it.
