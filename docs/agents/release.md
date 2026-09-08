# Releasing: tag-driven, manual, and always available

A `v*` tag is the only thing that publishes. Merging to `main` publishes nothing.

This page is the contract, not a convenience. The mechanics must work with no skill installed and no
model available, so everything needed to cut a release is a shell command below. A `/release` skill
sits on top of this path — drafting notes, judging the bump — and never replaces it.

Canonical reasoning: [`docs/design-adr/0004-compiled-entry-and-bounded-tarball.md`](../design-adr/0004-compiled-entry-and-bounded-tarball.md).

## The path

```bash
git checkout main && git pull            # cut releases from an up-to-date trunk
git status --porcelain                   # expect: empty
npm run verify                           # expect: exit 0

npm version <patch|minor|major> --no-git-tag-version   # bumps package.json + package-lock.json
# commit both with the `commit` skill — see the second warning below
git tag -a vX.Y.Z -m "vX.Y.Z"            # ANNOTATED — see the first warning below
git push --follow-tags                   # pushes the commit AND the tag, firing Publish
git ls-remote --tags origin | grep vX.Y.Z   # prove the tag landed; no tag, no publish
```

Then watch **Publish** in the Actions tab. It re-runs `npm run verify` and the same HIGH/CRITICAL
Trivy gate `security.yml` applies, then publishes over OIDC with provenance attached. A red verify,
a red scan or a failed build aborts before anything reaches the registry.

Afterwards: `npm view markdown-harness version` reports the tag you cut, and
`gh release create vX.Y.Z --title vX.Y.Z --notes-file <file>` publishes the notes. Published versions
are immutable — never overwrite one; bump again and re-tag.

## Three ways a release fails silently

**1. `git push --follow-tags` pushes annotated tags only.** A lightweight tag — `git tag vX.Y.Z`, no
`-a` — is skipped without a word. The push prints `main -> main`, exits `0`, and Publish never fires:
the release looks finished and nothing reached npm. That is what the `-a` and the `ls-remote` line are
for. Do not read a clean push as proof.

**2. This repo's commit-msg gate rejects a bare release commit.** It requires a Keep a Changelog
`### <category>` section carrying at least one numbered item, plus a `Source:` trailer, so
`git commit -m "chore(release): 0.2.0"` is refused. Use the `commit` skill, which writes a conforming
message and runs the gate before committing.

**3. A green `archgate check` in the pre-flight is not evidence.** It is scoped to the files changed
against `origin/main`, so on an up-to-date trunk its scope is empty by construction and it passes
over zero rules (AGENTS.md trap 1). It is in `verify` because it belongs in `verify`; it tells you
nothing at release time.

## One-time bootstrap

Both are already-or-once, and neither is part of a normal release. **They run in this order, which
is the reverse of how they were first written down:**

1. **A placeholder version, published by hand and never tagged.** OIDC cannot create a package that
   does not exist yet, so the name is claimed once from a machine with interactive 2FA. Publish it
   as `npm publish --tag placeholder`, not bare. A bare publish makes `0.0.0` the `latest` tag,
   which hands anyone who installs the package a fully working CLI presented as the current release.
   Measured 2026-09-07 against npm 11.17's own resolver: with only a `placeholder` tag,
   `npm install markdown-harness` still resolves to `0.0.0`, because a bare name is the range
   `*` rather than the tag `latest` — while `npm install markdown-harness@latest` fails
   `ETARGET` until the first real release. That second failure is the signal, not a defect.
2. **A trusted publisher** for `markdown-harness` on npmjs.com, scoped to this repository and to
   `.github/workflows/publish.yml`. There is deliberately no `NPM_TOKEN` secret and nothing to
   rotate; do not add one. It is second because trusted publishing is configured per package, so
   until step 1 has run there is nothing to attach it to. That ordering is inferred from how npm
   organises the setting rather than measured — whoever runs it first should correct this line if the
   interface turns out to allow pre-registering a name that has never been published.

The `0.0.x` range means "not a release"; the first tagged release is the first real one, and it is
a minor.

**The workflow cannot publish a prerelease, by construction.** `npm publish` refuses a prerelease
version under the default tag — npm 11.17 `lib/commands/publish.js:126-133`, _"You must specify a
tag using --tag when publishing a prerelease version"_ — and the publish step passes no `--tag`. A
`v0.1.0-rc.1` tag therefore fails that step loudly rather than shipping something unintended, so
release candidates are not a way to rehearse this pipeline. Cutting them means giving that step a
`--tag`, deliberately, as its own change.

## Choosing the bump

A human decision. The package stays in `0.x` until the command surface is deliberately declared
stable, so most releases are `patch` or `minor`. Anything that moves `bin`, an exit code, the response
envelope or the supported Node range is breaking for an adopter whatever the number says — say so in
the notes.
