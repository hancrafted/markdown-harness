# acme_corp — q3 export

<!-- expect: PASSES -->

THE CASE THAT PINS THE DELIMITER'S IDENTITY, and the suite was measurably weaker without it.

The stem splits on `__` into `acme_corp` and `q3-export`: two parts against two declared
segments, the vendor token is in its closed set, and the slug is kebab-case. Nothing is
reported.

Change the delimiter to a single `_` and this becomes three non-empty parts —
`acme`, `corp`, `q3-export` — and the count fails. That is the whole point of the case.
Every other name in this suite reads identically under `__` and under `_`, because an
empty part does not count and `a__b` therefore splits the same way both times. This file
was added after a mutation probe changed the delimiter to `_` and the entire Conformance
suite stayed green.

A SINGLE underscore is an ordinary character inside a part, which is also why the load-time
guard on `allowed[].value` refuses only a doubled one.
