# Packages

Every package here is a **deep module**: a lot of behaviour behind a small interface. Copy this
shape:

```
src/packages/
  <name>/
    check.ts        ← an entry point (public). Import this from outside.
    render.ts       ← another entry point. A package may expose SEVERAL.
    lib/            ← implementation: private, and free to import each other.
    tests/          ← co-located tests and fixtures (a subfolder, so private).
```

Public versus private is decided by **depth**, not by a name: a package's root files are its entry
points, and _anything_ in _any_ subfolder is private. So adding an entry point is adding a root
file, and adding an implementation folder never needs a config change.

**No barrel files.** Expose several small entry points instead of re-exporting a subtree through one
`index.ts`. A barrel makes the interface as wide as the implementation, which is the definition of a
shallow module.

Four boundary rules, all `error`, in [`.dependency-cruiser.cjs`](../../.dependency-cruiser.cjs):

**Entry-point boundary.** Code outside a package — root code such as `src/cli.ts`, or another
package — may import only that package's root files, never anything in its subfolders.

**Intra-package freedom.** A package's own files import each other freely. Depth is a property of the
interface, so the implementation behind it may be composed of as many small parts as it likes.

**Tests through the entry points.** A package's tests exercise it through its entry points like
everyone else. They may import any package's entry points and their own `tests/` fixtures, never any
package's internals — not even their own. This is what keeps the interface the test surface: a test
that reaches past it is testing something callers cannot reach, and it will break on a refactor that
changed no behaviour.

**No cycles.**

Two further **layering** rules — which packages may depend on which, as opposed to how they import —
encode this repo's own decomposition: `frontmatter-harness` may never import `core`, and `contract`
depends on nothing.

Run them:

```sh
npm run lint:boundaries
```

`npm run verify` runs the same check.
