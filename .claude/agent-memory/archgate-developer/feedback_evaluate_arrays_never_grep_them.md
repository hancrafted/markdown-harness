---
name: evaluate-arrays-never-grep-them
description: To state how many rules or selectors an enforcer holds, evaluate the array — grepping its source lines miscounts whenever a .map() generates entries
metadata:
  type: feedback
---

When an ADR claims a count of an enforcer's checks ("seven determinism selectors", "six boundary rules"), get the number by **evaluating the array**, never by grepping its source.

**Why:** `eslint.config.mjs` builds `EXPORTED_TYPE_DECLARATION` as `[3 node types].map(...).concat([3 literals])`. Grepping `selector:` returns **4** — three literals plus the single occurrence inside the `.map()` callback. The array actually evaluates to **6**. I shipped "four selectors" into a record on that basis; an independent reviewer caught it. The same trap hides in any config that generates entries from a list, which is exactly the style this repo prefers, because one list feeding two consumers is how it stops enforcers drifting.

**How to apply:** extract the expression into `node --input-type=module -e` and print `.length` plus each entry. Do this before writing any number into a `## Compliance and Enforcement` section. Same family as [[reproduce-measurement-before-calling-drift]]: the tool you measure with decides the answer, so name the method alongside the number.
