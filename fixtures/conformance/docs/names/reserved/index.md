# index

<!-- expect: PASSES -->

TWO MODULES GOVERN THIS FILE AND BOTH ARE SATISFIED. `reserved-stem-names` permits the stem `index`, and
the frontmatter Module's `index-files` rule forbids frontmatter — which this file carries none of.

It appears in neither Module's findings and is counted ONCE in `governedFiles`, because that count is the
union of paths rather than the sum of per-Module tallies.
