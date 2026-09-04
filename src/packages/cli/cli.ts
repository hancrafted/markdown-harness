#!/usr/bin/env node
// The `mh` entry point, and the only file that writes.
//
// Node runs this file directly rather than a build artefact, which is why the
// entry path carries no `enum` anywhere: type stripping erases declarations, it
// does not compile them, and an `enum` is the one TypeScript construct with
// runtime substance. `verbatimModuleSyntax` holds the same line for imports.

import { run } from './lib/run/query-run.impure.ts';

const termination = run(process.argv.slice(2));

if (termination.stdout !== '') process.stdout.write(termination.stdout);
if (termination.stderr !== '') process.stderr.write(termination.stderr);

// `exitCode` rather than `exit()`: the latter can truncate a pipe that has not
// drained, which would turn a large response into a silently short one.
process.exitCode = termination.code;
