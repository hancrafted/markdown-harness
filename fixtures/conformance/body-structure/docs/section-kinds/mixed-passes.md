<!-- expect: PASSES -->

An allowed set admits any mix of its kinds in any order and any number of times: `[prose, ordered-list]` takes a paragraph, a numbered list, another paragraph and a second numbered list. The second list starts at 3 because a paragraph ended the first, and the lexer still reads it as a numbered list.

## Mixed

Why.

1. First.
2. Second.

And then.

3. Third.
