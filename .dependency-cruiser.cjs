// @ts-check
// Deep-module enforcement for dependency-cruiser.
//
// Each package under the packages root is a DEEP MODULE: a lot of behaviour
// behind a small interface. A package's PUBLIC SURFACE is its ENTRY POINTS:
// the files at the package root. Implementation lives in SUBFOLDERS and is
// private (by convention `lib/` for implementation and `tests/` for tests,
// though any subfolder is private). A package may expose several small entry
// points (index.ts, client.ts, server.ts, …); prefer that over one giant
// barrel index.
//
// The only thing you should ever need to edit here is PACKAGES_ROOT.

/** Where packages live. One immediate child dir per package (flat, no nesting). */
const PACKAGES_ROOT = 'src/packages';

// --- derived patterns (no need to edit) -------------------------------------
const R = PACKAGES_ROOT;
/**
 * A package's private internals: anything nested inside a package subfolder.
 * The package's root files are its entry points and are NOT matched here:
 * they stay importable from outside.
 */
const PACKAGE_INTERNALS = `^${R}/[^/]+/[^/]+/`;

/**
 * The shared foundation Package: the gate through which the filesystem and
 * every other platform read is reached (ARCH-008 §2). Named here as a literal
 * rather than derived, because "which Package is the gate" is a product
 * decision and not a naming convention — a second Package called something
 * foundation-ish must not inherit the exemption by spelling.
 */
const GATE = 'foundation';

/**
 * ARCH-003 Decision 4's two test homes — `<pkg>/tests/*.test.ts` and
 * `<pkg>/<subfolder>/*.test.ts` — which together are every `.test.ts` BELOW a
 * Package root. A `.test.ts` AT a Package root is not among them and is not
 * matched: ARCH-004 §2.4 forbids a classified file there, so the carve-out
 * covers those two homes and no wider.
 *
 * The carve-out exists because ARCH-003 Decision 1.2 forbids `vi.mock`, so a
 * suite proving a symlink case has to plant one, and planting is a builtin
 * call. It is spent on test files only, and never on a production file.
 */
const TEST_HOMES = `^${R}/[^/]+/.+/[^/]+\\.test\\.ts$`;

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'entrypoint-boundary-from-app',
      comment: "App/root code may import a package's entry points (its root files), but nothing inside its subfolders.",
      severity: 'error',
      from: { pathNot: `^${R}/` }, // importer is NOT inside any package
      to: { path: PACKAGE_INTERNALS },
    },
    {
      name: 'entrypoint-boundary-across-packages',
      comment:
        "A package's own files import each other freely, but may reach OTHER packages only through their entry points, never their internals.",
      severity: 'error',
      // importer is inside a package ($1), but is not a test file
      from: { path: `^${R}/([^/]+)/`, pathNot: `^${R}/[^/]+/tests/` },
      to: {
        path: PACKAGE_INTERNALS,
        pathNot: `^${R}/$1/`, // same package → intra-package freedom
      },
    },
    {
      name: 'tests-through-entrypoints',
      comment:
        "A package's tests exercise it through its entry points like everyone else: they may import any package's entry points and their own tests/ fixtures, but never any package's internals, not even their own.",
      severity: 'error',
      from: { path: `^${R}/([^/]+)/tests/` }, // a test file, in package $1
      to: {
        path: PACKAGE_INTERNALS,
        pathNot: `^${R}/$1/tests/`, // own tests/ fixtures → allowed
      },
    },
    {
      name: 'colocated-test-lane',
      comment:
        "A test colocated below a package root tests ONE unit: it may import its same-directory sibling of the same base name with a .pure.ts suffix, and no other internal — not its own package's, not any other's. A unit may be as small as a single function, and extracting complex private logic into its own file is the standard way to make it testable, so a .pure.ts file is a legitimate subject. Any wider lane is a loophole: rename a file .pure.ts and every restriction lifts.",
      severity: 'error',
      // $1 package, $2 directory path below the package root, $3 base name. The
      // directory group is mandatory rather than optional: a colocated test is
      // always in a subfolder, because a package root file may carry no suffix.
      from: { path: `^${R}/([^/]+)/(.+)/([^/]+)\\.test\\.ts$`, pathNot: `^${R}/[^/]+/tests/` },
      to: {
        path: PACKAGE_INTERNALS,
        pathNot: `^${R}/$1/$2/$3\\.pure\\.ts$`, // the sibling under test → allowed
      },
    },
    {
      name: 'tests-folder-is-private',
      comment: "A package's tests/ folder is reachable only from tests: nothing else may import fixtures.",
      severity: 'error',
      from: { pathNot: `^${R}/[^/]+/tests/` }, // importer is not itself a test
      to: { path: `^${R}/[^/]+/tests/` },
    },
    // --- Purity boundary ------------------------------------------------------
    // A file carrying the deterministic classifier must produce a result that is
    // a function of its arguments alone. Neither rule below is visible inside a
    // single file, so eslint cannot hold them: the violating import sits in the
    // .pure.ts file while the effect it reaches lives somewhere else entirely.
    //
    // `tsPreCompilationDeps: true` (in options) is load-bearing here. Without it
    // a type-only import of an .impure.ts file is erased before these rules run,
    // and both report success over an edge that exists in the source.
    {
      name: 'pure-imports-no-impure',
      comment:
        'A .pure.ts file may not import an .impure.ts file. Extracting deterministic logic out of an impure file and then importing that file back is not an extraction: the dependency survives and only the line count moved.',
      severity: 'error',
      from: { path: `^${R}/[^/]+/.*\\.pure\\.ts$` },
      to: { path: `\\.impure\\.ts$` },
    },
    {
      name: 'pure-imports-no-builtin',
      comment:
        'A .pure.ts file may not import a platform builtin. A builtin reads the host, and a value read from the host arrives through no argument. This covers node:path deliberately: path.sep and path.join change with the host platform, so they are ambient reads like any other.',
      severity: 'error',
      from: { path: `^${R}/[^/]+/.*\\.pure\\.ts$` },
      to: { dependencyTypes: ['core'] },
    },
    {
      name: 'only-the-gate-imports-a-builtin',
      comment:
        "ARCH-008 §2.1: only the foundation Package may import a platform builtin; every other Package reaches the filesystem, the host separator and a module's own location through it. Two copies of a read are how two Modules end up disagreeing about whether a path is readable at all. Written against `dependencyTypes: [core]`, which is dependency-cruiser's word for a Node builtin and never this repository's word for Core.",
      severity: 'error',
      from: { path: `^${R}/`, pathNot: [`^${R}/${GATE}/`, TEST_HOMES] },
      to: { dependencyTypes: ['core'] },
    },
    {
      name: 'gate-builtins-sit-in-platform',
      comment:
        'ARCH-008 §2.2: inside the foundation Package, a builtin import must sit in `lib/platform/`. The gate is only reviewable if the syscalls are in one folder rather than scattered through the Package that is allowed to make them.',
      severity: 'error',
      from: { path: `^${R}/${GATE}/`, pathNot: [`^${R}/${GATE}/lib/platform/`, TEST_HOMES] },
      to: { dependencyTypes: ['core'] },
    },
    {
      name: 'no-circular',
      comment: 'No dependency cycles. Scope to `^${R}/` if you want to allow cycles outside packages.',
      severity: 'error',
      from: {},
      to: { circular: true },
    },

    // --- Layering (optional, off by default) ----------------------------------
    // Interface-hiding controls HOW you import (through the entry points).
    // Layering controls WHICH packages may depend on which. Add your own rules
    // here, e.g.:
    //
    // {
    //   name: "ui-may-not-depend-on-billing",
    //   severity: "error",
    //   from: { path: `^${R}/ui/` },
    //   to:   { path: `^${R}/billing/` },
    // },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsConfig: { fileName: 'tsconfig.json' },
    // Without this, dependency-cruiser sees only POST-compilation edges, so every
    // type-only import and re-export is erased before the six boundary rules run.
    // `config-contract` is a types-only Package: every edge in it is type-only, so
    // at `false` all six rules cruise it and check nothing while still reporting
    // "no dependency violations found".
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
    },
  },
};
