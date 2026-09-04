# Notes that never opened a block

<!-- expect: FAILS -->

There is no fence in this file at all. Under a constraining rule that reads as an
empty mapping, which is what lets `presence: required` fire on a file that never
opened a block — `MISSING_REQUIRED_FIELD` on `type`, not silence. Only a block that
exists and will not parse is `FRONTMATTER_UNPARSEABLE`; a block that was never
started is not a broken one.
