---
type: design-adr
status: accepted
---

# `MarkdownHarnessConfig` retires: the config file has no type, and a section comes back through its descriptor

With a dynamic Module set, a single interface over the whole config file can only be widened with an
index signature or made generic over a Module tuple, and both describe a consumer this architecture
does not have. So `MarkdownHarnessConfig` retires outright and nothing replaces it: the whole-file
type already exists under an honest name, `ConfigMapping`, and the load result hands each Module its
own validated section back through the descriptor that earned it —
`LoadedConfig.sectionFor<TSection>(module: ModuleDescriptor<TSection>): TSection | undefined`. The
declared Module set stays one list in `cli/module-set.ts`, pinned with `satisfies`, and
`TOP_LEVEL_KEYS` derives from it.

`config-contract` therefore stops describing the config file and becomes the shared vocabulary a
section is built from — selector, constraint, fault — plus the port a Module declares
through. All nine `frontmatter:` type declarations move into `frontmatter-harness`, exposed behind a
root `section.ts` re-exporting declarations from below, because ARCH-004 bans root `*.types.ts` and
ARCH-005 Decision 1.3 admits the re-export. Measurement decided that, not tidiness: section types left behind one
`config-contract` entry point make _no Module knows another Module exists_ unenforceable, because
`dependency-cruiser` passes blind at five modules and five dependencies and only catches the import
once each Module owns its own section type, at seven and six. One unbudgeted cycle was found on the
way — the port reaching `SectionValidation` and `ConfigFault` in `response-contract`, which reaches
`FieldConstraints` back in `config-contract` — repaired by moving `ConfigFault` and `ConfigFaultCode`
into `config-contract` and re-exporting them.

One compile-time guarantee is traded deliberately: a whole-config interface cannot name a key twice
(`TS2300`), and a derived list can, so two descriptors claiming `'frontmatter'` compile clean. The
replacement is a unit test beside `module-set.ts` asserting `new Set(keys).size === keys.length` —
the honest guard is a test rather than a derivation. A duplicate key is a **composition** error, not
a config error, and must never become a `ConfigFaultCode`: the Operator wrote nothing wrong. No typed
consumer breaks, measured rather than assumed — the published package declares no `exports`, no
`types` and no `main`, sets `declaration: false`, and ships zero `.d.ts`.
