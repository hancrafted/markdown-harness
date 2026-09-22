---
type: design-adr
status: accepted
---

# Claim is what one Module asks of one path

The glossary's claim was the superseded projection: what one Module says about one set of files, in
vocabulary Core owns, for a comparison Core does not perform. The word now follows the type the
response contract already ships. A claim is what one Module asks of one path: which Rule won, and
what that Rule requires. It does not name the Module. The shipped type keeps its name and stays in
the response contract.

The projection stays in
[`0008-claim-vocabulary-and-extent.md`](./0008-claim-vocabulary-and-extent.md), body intact and
disclaimed in that record's superseded note. This record is not an amendment of that record, and
not an amendment of
[`0009-retiring-the-whole-config-type.md`](./0009-retiring-the-whole-config-type.md). If the
projection returns it takes a different name. That name is not chosen here. Stance and extent leave
the glossary rather than retire in place: a retired entry would still describe behaviour no code
performs.

The module-boundaries ADR still describes that comparison. Marking Decision 5 and the consequence
that says Core compares claims — as the superseded projection, and as a target rather than a check
the code holds — is a delegation to `archgate:adr-author`, not an edit made beside the glossary.
This record does not edit that ADR. Decision 5 is not retracted.
