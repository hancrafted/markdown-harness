#!/usr/bin/env node
// The `mh` entry point, and the only file that writes.
//
// COMPILED rather than run from source, and not by preference: Node refuses to
// strip types for a file under `node_modules` and no flag lifts the refusal, so
// an installed adopter can only run JavaScript. `package.json`'s `bin` names the
// emitted twin of this file, never this file, and
// `docs/design-adr/0004-compiled-entry-and-bounded-tarball.md` records why — a
// reader who knows Node runs TypeScript will otherwise delete the build step.
//
// Retired with that build step: the entry path used to carry no `enum` anywhere,
// because type stripping erases declarations rather than compiling them. The
// compiler emits one correctly, so the ban has no reason left. Nothing here
// needs an `enum`, and none was added — the constraint is simply no longer one.

import { run } from './lib/run/invocation-run.impure.ts';

const termination = run(process.argv.slice(2));

if (termination.stdout !== '') process.stdout.write(termination.stdout);
if (termination.stderr !== '') process.stderr.write(termination.stderr);

// `exitCode` rather than `exit()`: the latter can truncate a pipe that has not
// drained, which would turn a large response into a silently short one.
process.exitCode = termination.code;
