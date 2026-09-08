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

Afterwards: `npm view @hancrafted/markdown-harness version` reports the tag you cut, and
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

The package publishes into the `hancrafted` npm organisation as `@hancrafted/markdown-harness`,
alongside its sibling `@hancrafted/typescript-ai-harness`. The scope is a registry namespace and
nothing else: `bin` still installs `markdown-harness` and `mh`, and the config file is still
`markdown-harness.config.yaml`. The one thing it does change is the publish command, which is why
`--access public` appears in step 1 below and in `publish.yml`.

Both are already-or-once, and neither is part of a normal release. **They run in this order, which
is the reverse of how they were first written down:**

1. **A placeholder version, published by hand.** OIDC cannot create a package that does not exist
   yet, so the name is claimed once from a machine with interactive 2FA:
   `npm publish --access public --tag placeholder`. `--access public` is not optional — npm defaults
   a scoped package to `restricted`, which needs a paid private-package plan, so without it the
   publish fails on the visibility rather than on the artefact.

   **`--tag placeholder` does not keep `latest` free, and this was run rather than reasoned.** The
   bootstrap happened on 2026-09-08 at 14:07:11Z, with that exact command, and the registry came
   back holding `{ placeholder: '0.0.0', latest: '0.0.0' }` — npm sets `dist-tags.latest` when it
   creates a package, whatever `--tag` says, because a package with no `latest` is not a state the
   registry keeps. So `npm install @hancrafted/markdown-harness@latest` resolves to `0.0.0` instead
   of failing `ETARGET`, and `latest` is freed only by the first real release superseding it. An
   earlier version of this page predicted the opposite from `npm-package-arg`'s spec parsing; the
   parser was read correctly and the conclusion was still wrong, because which tags exist is a
   registry write-path decision that no client-side resolver can tell you. **Treat the bootstrap
   publish as making the package installable as `latest`, and get the first real release out
   promptly** — do not plan around a window that `--tag` cannot actually create.

2. **A trusted publisher** for `@hancrafted/markdown-harness` on npmjs.com, scoped to this repository and to
   `.github/workflows/publish.yml`. There is deliberately no `NPM_TOKEN` secret and nothing to
   rotate; do not add one. It is second because a trusted publisher lives on the package's own
   settings page, so until step 1 has run there is nothing to attach it to — [npm/cli#8544](https://github.com/npm/cli/issues/8544),
   and confirmed the hard way in the sibling repository, whose ADR-0009 records the same bootstrap.
   The ordering is no longer inferred.

   Four values have to match the OIDC claim exactly, and a mismatch in any of them surfaces as a
   misleading `E404` or `ENEEDAUTH` rather than as a diagnostic naming the config
   ([npm/cli#9088](https://github.com/npm/cli/issues/9088)): the **owner** `hancrafted`, the
   **repository** `markdown-harness`, the **workflow filename** `publish.yml` — the bare filename,
   no directory, no trailing space — and the **environment**, which must be left blank because this
   workflow declares none.

   **A rejected match costs a re-run, not a tag.** The OIDC token is minted fresh for each run, so
   after fixing the configuration `gh run rerun <run-id>` publishes the same tag. Never bump the
   version to retry an auth failure.

The `0.0.x` range means "not a release", and the first _real_ release is a minor. `0.0.1` was
nevertheless tagged and published on 2026-09-08, as a deliberate interim rather than a slip: the
workshop is on 2026-09-10, and having an installable coordinate that trainees can put in front of a
Host harness was worth more than keeping the range pure for two days. `0.1.0` — the release this
page means by "the first real one" — is due 2026-09-09 EOB. Until it lands, read a `0.0.x` version
as installable but provisional: it makes no promise about the command surface, and the surface may
move under it without the number saying so.

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
