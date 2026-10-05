<!-- expect: PASSES -->

A strict changelog that follows the convention. Each release's change headings are judged inside that release alone, so the second release's `Added` after the first release's `Fixed` is in order: a flat spine walked once over the whole file would call it out of order. `Unreleased` is a release heading too, because it opens with a bracket.

# Changelog

## [Unreleased]

### Added

- A new flag.

## [2.0.0] - 2026-03-01

### Changed

- The default output.

### Fixed

- A crash on empty input.

## [1.0.0] - 2026-01-01

### Added

- The first release.

### Security

- A patched dependency.
