<!-- expect: FAILS -->

Inside one release `Fixed` comes before `Added`. The nested walk claims `Added` and moves past it, so `Fixed` lies behind the cursor and its entry is out of order, reported under the release it sits in.

# Changelog

## [1.0.0] - 2026-01-01

### Fixed

- A bug.

### Added

- A feature.
