# legacy — export

<!-- expect: PASSES -->

THE DECISION THAT SCOPES THE DELIMITER, in one file. `archive-stem-names` declares no `segments:`, so `__`
is an ordinary pair of characters and this 14-character stem simply fits under the cap.

A product-wide reservation was rejected. The response contract has nowhere to put it — a file governed only
by `frontmatter:` has no `file-names` block at all — so reporting it would need the frontmatter Module to
name a file name, which the growth rule forbids. Measured too: 0 of 75 basenames here and 0 of 15 in the
second corpus contain `__`, so the wider reading buys nothing.
