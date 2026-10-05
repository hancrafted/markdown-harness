<!-- expect: PASSES -->

A block of a kind the vocabulary does not name is invisible to `mayHold`: it is neither allowed nor forbidden, because it has no name to list. The numbered list is the only block the section’s entry judges; the fence, the table, the block quote, the HTML comment, the thematic break and the link reference definition beside it are not reported.

## Ordered

1. First.
2. Second.

```text
code
```

| a | b |
| - | - |
| 1 | 2 |

> A quotation.

<!-- a comment -->

***

[ref]: https://example.com
