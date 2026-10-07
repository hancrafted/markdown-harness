---
type: guide
---
<!-- expect: FAILS -->

`research-untyped` selects by folder alone and is listed before `guides`, so it wins over the `type` match. Under `guides` this file would pass; under the winning Rule, whose `maxLevel` is 1, its second-level headings are too deep.

# Guide

## One

## Two
