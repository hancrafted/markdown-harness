# aikb — ab

<!-- expect: FAILS -->

`ab` is two characters against `minLength: 3`, so `FILE_NAMES__VALUE_TOO_SHORT` fires. The form is
otherwise perfect, which is what makes this a length finding and not a format one — two codes because the
repairs are opposite and an agent should not have to compare the value against the bound to know which way
to move.
