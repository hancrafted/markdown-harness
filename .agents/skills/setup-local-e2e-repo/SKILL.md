---
name: setup-local-e2e-repo
description:
  Mint throwaway local repositories that look like an adopter's, for end-to-end runs of markdown-harness. Use when
  testing the markdown-harness skill from a user's point of view, reproducing a first-run experience, checking that
  the init or demo workflow works on a clean tree, or preparing repositories for a workshop.
---

An end-to-end run answers one question: does someone meeting this tool for the first time get where they are going?
That only holds on a repository with no history of our fixes — so these are minted fresh and thrown away, never
recycled.

## 1. Decide what the run is proving

The judgement, and it decides everything downstream. Ask before minting anything:

| Question                              | Why it changes the run                                                              |
| ------------------------------------- | ----------------------------------------------------------------------------------- |
| Local checkout, or published tarball? | A checkout tests unreleased work; the tarball tests what an adopter actually gets   |
| One repository, or several?           | Several only earn their cost when comparing different starting states               |
| Does it need the dev-tooling harness? | It supplies the `verify` script init extends — skip it and init creates one instead |

Default to the **published tarball** unless testing something unreleased. A run against a local checkout can pass on
code nobody can install yet, which is the one result that misleads rather than informs.

_Done when_ you can say what a pass would prove and what it would not.

## 2. Mint the repositories

```sh
node .agents/skills/setup-local-e2e-repo/scripts/new-repo.mjs --name wiki-a
```

| Flag             | Effect                                                               |
| ---------------- | -------------------------------------------------------------------- |
| `--name`         | Required. The repository's directory name                            |
| `--under`        | Where it lands. Defaults to `~/Developer/mh-e2e`                     |
| `--source`       | `published` (default), or a path to a local checkout to link instead |
| `--skip-harness` | Skips `@hancrafted/typescript-ai-harness`, much the slowest step     |

It refuses to touch a directory that already exists. That is deliberate: a half-recycled repository is the one thing
that makes an end-to-end result untrustworthy, and reusing one has produced false passes before.

Run it once per repository. It reports JSON, and `next` carries the exact command to continue with.

_Done when_ every step reports `"ok": true`.

## 3. Hand over to the tool's own skill

From here the `markdown-harness` skill drives, exactly as it would for an adopter — this skill's job is finished once
a clean tree exists. Open a session in the new repository and let it read the state itself rather than telling it what
you just built.

The run to reproduce a genuine first encounter is: state probe, `init.md`, then `demo.md`.

**The hook check needs a fresh session, not a resumed one.** `--continue` and `--resume` replay saved context instead
of re-running hooks, so a resumed session shows a freshness notice from a hook that never fired. That fakes a pass,
and it is the single easiest way to get a wrong answer out of this.

_Done when_ a fresh session reports the stale demo file as stale without being prompted.

## 4. Throw them away

```sh
rm -rf ~/Developer/mh-e2e/wiki-a
```

Delete them when the run is done rather than keeping them for next time. The next run's value comes from the tree
being untouched, and a kept repository quietly stops being one.

_Done when_ the directory is gone, and anything learned is recorded somewhere that is not the repository.
