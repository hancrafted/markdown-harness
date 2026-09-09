---
type: note
---

# Rate limits, undated

<!-- expect: FAILS -->
<!-- assess: FIX_FILE -->

The `freshness` rule requires `stale_after`, so this file FAILS `--check` on a
missing required field. `--assess` answers `FIX_FILE` about the same absence,
and deliberately does not answer `PROCEED`.

That distinction is the one this case exists to freeze. A file that never said
when to stop trusting it has made no freshness claim at all, and reporting no
claim as a good claim would let an ungoverned-in-practice document read as a
sound one.
