# aikb — llm — wiki

<!-- expect: FAILS -->

Three parts where two are declared, so `FILE_NAMES__TOO_MANY_SEGMENTS` fires. Two count codes rather than
one, on `exactlyOneOf`'s precedent: an exact-count constraint fails in opposite directions and the repairs
are opposite. A greedy last segment was rejected — it would blame the slug's format for a delimiter placed
elsewhere, and let a segment quietly hold a `__` of its own.
