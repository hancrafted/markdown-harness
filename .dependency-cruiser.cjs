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
// `.cjs` deliberately: `module.exports` has to survive `"type": "module"`.
//
// The only thing you should ever need to edit here is PACKAGES_ROOT — plus the
// layering block at the bottom, which this repo has filled in.

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
      name: 'tests-folder-is-private',
      comment: "A package's tests/ folder is reachable only from tests: nothing else may import fixtures.",
      severity: 'error',
      from: { pathNot: `^${R}/[^/]+/tests/` }, // importer is not itself a test
      to: { path: `^${R}/[^/]+/tests/` },
    },
    {
      name: 'no-circular',
      comment: 'No dependency cycles. Scope to `^${R}/` if you want to allow cycles outside packages.',
      severity: 'error',
      from: {},
      to: { circular: true },
    },

    // --- Layering ------------------------------------------------------------
    // Interface-hiding controls HOW you import (through the entry points).
    // Layering controls WHICH packages may depend on which.
    //
    // CONTEXT.md defines the Core as "the parts that know nothing about
    // markdown frontmatter". This rule is what holds that claim mechanically:
    // the Module gets handed its config section and a parsed mapping, and can
    // never reach back for the file, the glob, the walker or the report.
    // Reverse it and `frontmatter-harness` stops being substitutable by a
    // second Module, which is the whole point of the decomposition.
    {
      name: 'module-may-not-depend-on-core',
      comment:
        'A Module owns one section of the config and one family of checks. It knows nothing about files, globs, YAML or reporting, so it may never import the Core.',
      severity: 'error',
      from: { path: `^${R}/frontmatter-harness/` },
      to: { path: `^${R}/core/` },
    },
    {
      name: 'contract-depends-on-nothing',
      comment:
        'The contract is THE PORTABLE ARTIFACT (tenet 4): the config language and the report format. A dependency on an implementation package would make the specification depend on one implementation of it.',
      severity: 'error',
      from: { path: `^${R}/contract/`, pathNot: `^${R}/contract/tests/` },
      to: { path: `^${R}/(?!contract/)` },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsConfig: { fileName: 'tsconfig.json' },
    /**
     * REQUIRED HERE, not a preference. Off (the default) dependency-cruiser
     * sees only dependencies that survive to JavaScript, so `import type` is
     * invisible to it — measured: with this off, the whole `contract` package
     * cruised as zero dependencies and every rule below passed vacuously.
     * `contract` is type-only by design, so without this the specification's
     * own boundary is the one boundary not enforced.
     */
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
    },
  },
};
