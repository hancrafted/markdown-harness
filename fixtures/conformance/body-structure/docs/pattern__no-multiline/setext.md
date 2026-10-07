<!-- expect: FAILS -->

No `m` flag is set, so `^` anchors the start of the whole content and not of its second line. Under `m` the line `One` would match.

# Doc

Source:
One
---
