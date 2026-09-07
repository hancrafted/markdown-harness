---
name: body-governing-modules-planned
description: Han intends Modules that govern markdown BODY content, not just frontmatter — stated 2026-09-04, and not derivable from the vision docs or the frozen spec
metadata:
  type: project
---

`markdown-harness` will eventually carry Modules that govern or produce signals for the **markdown body**, not only YAML frontmatter. Han stated this on 2026-09-04 while grilling the CLI package set.

**Why:** It is load-bearing and contradicts what the records appear to say. `docs/evals/ablation/implementation-spec.md` §9 lists "rules about markdown **body** content (frontmatter only)" as out of scope, and `docs/vision/architecture.md:176` calls the second Module's shape deliberately open and "aimed at reviewability". Both are true for the current delivery; neither means body governance is off the roadmap. The intent is what justified `markdown-file-tree` existing as its own Package rather than living inside `frontmatter-harness/lib/` — two Modules will need one enumeration reach.

**How to apply:** Treat markdown-file enumeration, and anything else Module-agnostic, as shared surface rather than frontmatter-private. Note the known consequence recorded in the map (#29): `CheckSummary.governedFiles` is "files at least one rule governs", which becomes ambiguous once a body Module lands, since `response-contract` v1 has no Module dimension — union or per-Module is undecided. "Governed" is per-Module: a file may be governed by frontmatter rules and invisible to body rules.

See [[stated-intent-beats-deliberately-open]].
