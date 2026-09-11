# aikb —

<!-- expect: FAILS -->

A trailing delimiter with nothing after it. The empty part does not count, so the stem has ONE part against
two declared and `FILE_NAMES__TOO_FEW_SEGMENTS` fires. That is the point of the non-empty rule: the repair
named is "add the missing part", not "fix the format of a blank".
