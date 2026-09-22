---
type: adr
id: ARCH-012
title: 'Skill Script Adapters'
domain: architecture
rules: false
files: ['.agents/skills/markdown-harness/scripts/**', '.agents/skills/setup-local-e2e-repo/scripts/new-repo.mjs']
paths: ['.agents/skills/markdown-harness/scripts/**', '.agents/skills/setup-local-e2e-repo/scripts/new-repo.mjs']
---

# Skill Script Adapters

## Context

The markdown-harness skill reaches an adopter through JavaScript files outside `src/`. Before this
record, the Package disciplines reached none of them: their direct platform imports sat outside the
foundation gate, their decisions had no pure classifier, and the command Package's private
process-boundary test reached an unrelated script by absolute path. A green Package check therefore
said nothing about the files an adopter actually invokes.

Three alternatives were considered:

1. **Leave scripts outside every record.** Rejected. A shipped decision without a governing record
   is a known reach gap, not a legitimate exception.
2. **Move every line into a Package.** Rejected. `init.mjs` must install the package before a
   compiled Package can be imported, and the hook must record `not-installed` precisely when that
   import is unavailable. Removing either would change the tested product behaviour.
3. **Copy compiled runtime code into the skill.** Rejected. Two distributed implementations would
   drift while appearing self-contained, and the skills channel would become a second build
   artefact.
4. **Keep adapters in the skill and place product decisions in a Package.** Accepted. The skill
   keeps its one-skill bootstrap while the ordinary path loads the compiled implementation from the
   already-installed product.

For markdown-harness, this preserves the product boundary in the architecture vision: the skill is
an optional Host harness layer, while the npm package is the deterministic product. For
setup-local-e2e-repo, no package can be a prerequisite: it creates the blank repository that
receives both the package and the skill. Its one script is therefore governed where it stands.

## Decision

1. `.agents/skills/markdown-harness/scripts/**` and
   `.agents/skills/setup-local-e2e-repo/scripts/new-repo.mjs` MUST be governed by this record.
2. A markdown-harness skill script MUST be an Adapter: it gathers Host harness input, resolves the
   installed package, applies filesystem or subprocess effects, and writes its documented output.
   It MUST NOT duplicate a product decision available from `src/packages/skill-runtime/`.
3. `skill-runtime` MUST hold deterministic decisions as `*.pure.ts` members and expose narrow
   Package entry points. Its compiled twins under `dist/packages/skill-runtime/` are the only
   implementation a post-install skill adapter imports.
4. Bootstrap is the sole exception. Before the package exists, `init.mjs` MAY install it and
   `activity-log.mjs` MAY append the hook's `not-installed` row. The exception ends once an
   installed runtime is resolvable; it MUST NOT grow a second ordinary implementation.
5. `setup-local-e2e-repo/scripts/new-repo.mjs` MUST remain self-contained because it constructs the
   environment in which the package becomes available. Its decisions stay in that script and are
   reviewed under this record.
6. `setup-ts-deep-modules/dependency-cruiser.config.cjs` is a copied configuration template rather
   than an invoked markdown-harness product or bootstrap script. It is outside this record and
   outside #192.

## Do's and Don'ts

### Do's

1. **DO** add post-install decisions to `src/packages/skill-runtime/` behind a Package root entry
   point. (Decision 2, 3)
2. **DO** keep the absent-package path to package discovery, installation, and the
   `not-installed` activity proof. (Decision 4)
3. **DO** build before a process-boundary hook suite, so its adapter imports the current compiled
   runtime. (Decision 3)
4. **DO** keep `new-repo.mjs` able to mint a repository with no pre-installed markdown-harness
   package. (Decision 5)
5. **DO** update the process-boundary hook suite when an adapter's observable protocol changes.
   (Decision 2)

### Don'ts

1. **DON'T** import a `src/` file from a skill script. (Decision 3)
2. **DON'T** add a second copy of a normal-path product decision to an adapter. (Decision 2)
3. **DON'T** make the bootstrap branch the normal path after an installed runtime can be resolved.
   (Decision 4)
4. **DON'T** move `new-repo.mjs` behind a package it is responsible for installing. (Decision 5)
5. **DON'T** treat the dependency-cruiser configuration template as an invoked product script.
   (Decision 6)

## Consequences

**Positive:**

1. **Governed exceptions:** every executed skills-channel JavaScript file is either a Package member
   or named by this record.
2. **One ordinary implementation:** compiled Package code, not a copied skill implementation,
   decides post-install behaviour.
3. **Bootstrap remains usable:** an Operator can download the markdown-harness skill first and use
   it to install the product it later delegates to.

**Negative:**

1. **Asynchronous adapters:** dynamic import makes adapters asynchronous, which is extra sequencing
   compared with a direct local import.
2. **A narrow duplicate remains:** the absent-package activity row has a bootstrap implementation
   beside the Package implementation.
3. **Manual reach review:** Package enforcement cannot cruise JavaScript assets outside `src/`.

**Risks:**

1. **Runtime/package skew:** a skill can meet an older installed package that lacks a runtime entry.
   **Mitigation:** adapters refuse explicitly rather than silently falling back to a second normal
   implementation.
2. **Bootstrap expansion:** an adapter can accumulate product decisions because it is convenient.
   **Mitigation:** reviewers compare every new adapter branch against the explicit exception in
   Decision 4.
3. **A stale compiled artefact:** a hook suite can exercise yesterday's `dist/`. **Mitigation:**
   build immediately before the process-boundary suite, as design-ADR 0004 requires.

## Compliance and Enforcement

`ARCH-004`, `ARCH-006` and `ARCH-007` govern `skill-runtime` through their existing classifiers,
eslint configuration and dependency-cruiser rules. The Package's tests exercise its root entry
points; `src/packages/cli/tests/assess-hook.test.ts` retains the Host harness process boundary.

No automatic classifier reaches the scripts in this record: eslint configures source and test
TypeScript, dependency-cruiser starts at `src/`, and `archgate check` can establish scope but cannot
prove an Adapter contains no duplicated decision. Reviewers MUST verify that a changed
markdown-harness script delegates every post-install decision through the compiled Package entry
point, that a bootstrap change fits Decision 4 exactly, and that `new-repo.mjs` remains runnable in
an empty repository.

An exception requires a new ADR. A new skills-channel executable requires either inclusion in this
record with the reason it cannot live in a Package, or a Package home under `src/packages/`.

## References

- [Folders and Files](./ARCH-004-folders-and-files.md)
- [The pure Classifier](./ARCH-006-file-suffix-pure.md)
- [The impure Classifier](./ARCH-007-file-suffix-impure.md)
- [The published artefact is a compiled entry point, bounded to what runs, and refuses an unsupported Node](../../docs/design-adr/0004-compiled-entry-and-bounded-tarball.md)
- [Architecture vision](../../docs/vision/architecture.md)
