---
type: design-adr
status: accepted
---

# The config's top level is one key per Module, and a Module-wide default lives inside its Module

`assess` is the first feature to need a setting that is not per-path — one default sentence an
Operator writes once and overrides on the Rules that deserve their own. Nothing in the config
language had a place for that. Every key below `frontmatter:` varies by path, and the top level
held exactly one key.

The decision is two sentences, and they are the rule every later feature is placed by:

> The top level is one key per Module, and nothing else. Inside a Module: `rules:` for what varies
> by path, plus optional Module-wide keys for what does not.

So `assess` sits inside the `frontmatter` Module, at two levels:

```yaml
frontmatter:
  assess:
    stale: This file is past its freshness date. Tell the user and offer to re-verify it.
  rules:
    - ruleId: research
      intent: Research is indexed, so it carries a description and names its sources.
      path: [docs/research/**/*.md]
      assess:
        stale: Re-verify by web research before quoting this.
      fields:
        stale_after: { presence: required, format: datetime }
```

This extends a rule that already existed rather than inventing one. `config.types.ts` states that
_"Modules get a section apiece"_ and that _"unknown top-level keys are a config error, so gaining a
section later is a deliberate amendment rather than an accident"_ — enforced by
`CONFIG_UNRECOGNISED_KEY`. What was missing was only the second half: where a Module's own
non-path setting goes.

**A Rule's `assess:` replaces the Module default whole; it never merges key by key.** A Rule that
writes the block owns it entirely, and a Rule that writes nothing gets the default entirely.

## Considered options

**A top-level `assess:` section, beside `frontmatter:`.** Rejected, and it is the option worth
naming because it is the one that looks natural — the prompt is not really about frontmatter, it is
about what an agent should do. But `assess` reads `stale_after`, which _is_ a frontmatter field, so
a top-level section would be one Module's key reaching into another Module's data. Modules that
govern the markdown body are intended, and on the day the second one lands a top-level `assess:`
has to answer which Module's signals it means. That is a precedence rule _between_ Modules, and it
is the same second dimension `config.types.ts` already refused when it ruled out a second config
file: _"a second config would need a precedence rule between files, which is the second precedence
dimension this design exists to avoid."_ One refusal, applied consistently.

**A shared `defaults:` block, holding every Module's defaults together.** Rejected for the reason
above plus one of its own: it puts two Modules' settings in one namespace, so the first collision
between them is a naming accident rather than a design conversation.

**Per-key merging for the Rule-level override.** Rejected. Tenet 5's sentence is _"the first
matching Rule is the complete set of Constraints"_, which survives whole-block replacement and dies
under merge — under merge a reader must always compose two sources and can never read one. Merging
also recreates the exact defect `--audit` exists to cure: `--audit` was built because first-match
makes losing Rules silent, and per-key merging makes losing _prompts_ silent the same way, needing
a second audit to say which half of a prompt came from where. And it makes deletion dangerous:
removing one key from a Rule would silently reactivate the global for that key alone, so a
one-line diff changes what an agent is told.

The decision was free to make at the time it was made. `assess` shipped with exactly one condition,
`stale`, and with one condition replacement and merging are indistinguishable. Nothing observable
was traded; a permanent choice was simply taken while it still cost nothing.

## Consequences

1. **A Module-wide default is expensive to adopt, on purpose.** A prompt that can never fire is an
   Operator mistake nothing else would report, so a Rule carrying an effective `assess.stale`
   without `stale_after: { presence: required }` beside it is rejected as
   `CONFIG_ASSESS_WITHOUT_REQUIRED_FIELD`. Because the check runs against the _effective_ prompt,
   writing the Module-wide default forces that discipline onto every constraining Rule in the
   Module at once. Rules declaring `frontmatter: forbidden` are exempt: a file that must carry no
   frontmatter cannot be assessed.
2. **An Operator who wants three defaults and one override must restate all four.** That is the
   standing cost of replacement. It is the same trade `fields:` already makes under first-match, so
   the language pays it consistently rather than in one place only. It is also softening rather
   than hardening over time, because configs are increasingly written and updated by models, for
   which restating a block is not a real authoring cost.
3. **The second Module has a shape waiting for it.** A body-governing Module gets `body:` at the
   top level with its own `rules:` and its own Module-wide keys, and neither Module can name the
   other's data. Note the separate open question this does not settle:
   `CheckSummary.governedFiles` means "files at least one rule governs", which becomes ambiguous
   the moment two Modules exist, since `response-contract` has no Module dimension.
4. **The response can name a prompt's origin in one word.** Because a prompt comes from exactly one
   place, `--assess` answers with `"source": "rule"` or `"source": "module"`. Under merging that
   field would have had to be per-key, or be a lie.
