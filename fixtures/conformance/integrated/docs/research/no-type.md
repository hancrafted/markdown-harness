<!-- expect: FAILS -->

Silent type miss, missing value. With no `type` the file selects no `types` Rule, so `body-structure` governs nothing about it and stays silent while `frontmatter`, which requires `type`, reports it. A Constraint reports an absence and a selector does not. This behaviour is deliberate and frozen.

# Report
