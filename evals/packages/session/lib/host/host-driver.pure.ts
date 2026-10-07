// The host driver table: everything that differs between Host harnesses at the point a session is started or its
// result is read, in one entry per Host harness typed by HostName. A caller asks the table for a driver and never
// compares the Host harness name itself, so a third Host harness is one entry here and one in the profile table.

import type { InitExpectation } from '../failure/failure-classifier.types.ts';
import { parseAgyStream } from '../stream/agy-stream.pure.ts';
import { parseSessionStream } from '../stream/session-stream.pure.ts';
import { buildAgyArgv, buildAgyEnvironment } from './agy-invocation.pure.ts';
import type { HostDriver } from './host-driver.types.ts';
import { buildChildEnvironment, buildClaudeArgv } from './host-invocation.pure.ts';
import type { HostName } from './host-profile.types.ts';

const CLAUDE_EXPECTATION: InitExpectation = {
  apiKeySource: 'none',
  expectedPlugins: ['cc-plugin-agents-md', 'cc-plugin-telemetry'],
};

const DRIVERS: Readonly<Record<HostName, HostDriver>> = {
  'claude-code': {
    argv: (input) =>
      buildClaudeArgv({
        task: input.task,
        model: input.model,
        maxTurns: input.maxTurns,
        tools: input.tools,
        allowedTools: input.allowedTools,
      }),
    environment: (parent) => buildChildEnvironment(parent),
    parse: parseSessionStream,
    // Asked for by alias, so only authentication and plugins are checked.
    initExpectation: () => CLAUDE_EXPECTATION,
  },
  antigravity: {
    argv: (input) =>
      buildAgyArgv({
        task: input.task,
        model: input.model,
        wallClockMs: input.wallClockMs,
        scopedMode: input.scopedMode,
      }),
    environment: buildAgyEnvironment,
    parse: parseAgyStream,
    // Asked for by model id and a permission mode, and its init event reports both, so a run on another model, or
    // in another mode, is an instrument failure and never a score.
    initExpectation: (model, profile) => ({
      apiKeySource: 'unknown',
      expectedPlugins: [],
      permissionMode: profile.initPermissionMode,
      model,
    }),
  },
};

export function driverOf(name: HostName): HostDriver {
  return DRIVERS[name];
}
