---
type: workflow
title: Cut a release, publish the package, tag the commit, update the changelog, and announce it
description: A workflow whose title has become its own documentation.
---

FAILS `maxLength: 80` on `title`. Ninety-three characters. `minLength` and
`maxLength` are separate codes rather than one range violation, because the
repairs are opposite and an agent should not have to compare the value against
the bound to work out which way to move.
