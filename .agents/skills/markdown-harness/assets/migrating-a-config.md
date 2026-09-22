# Migrating a config off the glob grammar

Reached from `authoring-a-config.md` step 1, when the config already there carries `path:`,
`fileName:`, or any selector value with a `*` in it. That grammar is gone: `mh --query` rejects it
outright, with `CONFIG_UNRECOGNISED_KEY` on the old key and `CONFIG_SELECTOR_MISSING` right behind it,
because a config on the old grammar has no `folders:` or `fileNames:` for the loader to find.

The replacement is two literal axes, no wildcard anywhere:

```yaml
folders: [docs/research/] # one folder token, repo-root-relative, trailing `/`, no recursion
fileNames: [index.md] # one literal basename, extension included, matched at any depth
```

At least one axis is required. An absent axis means every: `folders` alone is every file in those
folders, `fileNames` alone is that name anywhere in the corpus, both together intersect.

Translate one rule at a time, in the order the config already lists them — the same discipline as
authoring a new one. Run `mh --query` after each translated rule, on a path that rule should still
win. Do not translate the whole file in one pass: a config translated all at once goes red across the
corpus at the same moment authoring one in one pass would.

## The four selectors you will meet

**A directory glob with recursion**, `path: [docs/research/**/*.md]`, becomes `folders: [docs/research/]`
when nothing beneath it needs splitting out, or one folder token per existing subfolder when the rule
must keep reaching them individually — a folder token selects that folder alone. Either way, name it as
**approximate**: recursion is gone, and a subfolder created under a named folder later is governed by
nothing until this list is edited by hand. That is a cost paid once per folder, not per file, and it is
worth stating in the summary rather than leaving silent.

**A name matched anywhere**, `path: [**/index.md]` or an old `fileName: index.md`, becomes
`fileNames: [index.md]` outright. Nothing is lost — neither spelling carried a folder, so neither
carried recursion to lose.

**One named file under one folder**, `path: [docs/research/log.md]`, has two valid translations that
agree today and diverge the moment a second `log.md` exists anywhere else in the corpus:
`{ folders: [docs/research/], fileNames: [log.md] }` (scoped to that folder, exact) or
`fileNames: [log.md]` alone (reaches that name everywhere). Default to the scoped form — it is the
one that means what the old rule meant — and only reach for the name alone when the intent really is
"this name, wherever it turns up." State which one you picked and why; do not leave it implicit.

**An exclusion**, `excludeFiles: [<glob>]`, uses the same selector object under the same at-least-one
rule, and it is the one place a wrong translation costs more than a missed file. Under first-match, an
excluded file does not become exempt — it falls through to whatever rule comes next, and if nothing
below it matches, the file goes **ungoverned** rather than governed-but-unconstrained. A name-only
exclusion translated as `fileNames: [<name>]` alone reaches that name **anywhere in the corpus**, so a
file sharing that name in an unrelated folder silently stops being governed the day it is added. Scope
every exclusion with `folders` unless the old glob genuinely excluded that name everywhere.

## Verify the migration held, not just each rule

`mh --query` proves one rule at a time; it does not prove the corpus came out the same shape. Before
touching the file, run `mh --audit` (or `mh --check`) against the config as it stands and note the
`governedFiles` count and the violation count. After every rule is translated, run the same command
again. The two counts match, or the difference is named as the contract change it is — a folder that
picked up a new subfolder, an exclusion that now reaches fewer files than the glob did. A silent count
change is the migration having moved the boundary of governance without anyone deciding to.

_Done when_ every old-grammar key is gone, `mh --audit` reports the same `governedFiles` and violation
counts as before (or states why they differ), and the summary names every rule that lost recursion —
so the reader knows which folder lists to watch for staleness. Continue at `authoring-a-config.md` step
2 only if the user also wants to add or change a rule; a pure migration ends here.
