# Held-out edges

A second suite, applied over a run's output tree at scoring time. **No run ever receives it.**
`copy_kit` stamps `kit/fixtures` and `kit/tests` into a run and nothing else, so this directory
is out of reach of every arm by construction rather than by care.

```sh
bash docs/evals/ablation/held-out/run.sh ~/Developer/ablation-runs/<run-id>
```

## Why it exists

The frozen acceptance kit saturates. All four runs completed before 2026-09-04 reached
`24/15/22`, so the study's only objective, arm-blind axis discriminated nothing between arms.

Meanwhile those same four runs diverged on fourteen behaviours the frozen corpus never reaches —
and volunteered every one of them in their own `RESULTS.md` under "where the spec ran out":

- three different code names for an unparseable frontmatter block, and two different answers for
  what happens to one under `frontmatter: forbidden`;
- opposite answers on whether an empty string satisfies `allOf`;
- opposite answers on whether an entry address over a non-list reports or stays silent;
- opposite answers on whether a repeated flag is a usage error or last-one-wins;
- three answers for a non-existent `--root`, one of them an uncaught `ENOENT`;
- three different orders for the violations inside a single file.

Every fixture in the frozen corpus that has frontmatter parses as valid YAML, so a run could ship
no malformed-frontmatter handling at all and still pass the gate. `provenance-broken.md` is valid
YAML carrying five malformed _formats_, which is a different thing.

## Why held out rather than published

Both halves are needed, and they pull in opposite directions:

- The spec **defines** these behaviours now (§2, §3.3, §3.5, §4.6, §4.7). A delegated behaviour
  cannot be scored — "shape: your choice" is a fair instruction and an unmarkable answer.
- The suite stays **unpublished**. A test a run can read is a test it can satisfy without
  understanding, which measures transcription rather than comprehension.

## What it is not

Not a gate. A run that fails an edge is still functional, and layer 1 decides that. `check.mjs`
therefore tabulates edge failures and still exits 0; a **non-zero exit means the instrument could
not run** — no resolvable `bin.mh`, or `--check` produced no JSON where the spec promises some.
Those are different facts and the exit code keeps them apart.

Not wired into any arm's `verify`, and not counted in the frozen verdict. The
`FRONTMATTER_UNPARSEABLE` code the spec now names sits outside §4.7's eighteen, so "all 18 codes
reached" is unaffected.
