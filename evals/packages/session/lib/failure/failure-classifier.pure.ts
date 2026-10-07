// The failure classifier: the raw record of one session in, a graded outcome or an
// instrument failure of a named kind out. The Host harness's exit code is never an
// input; R0 settled that exit 0 proves nothing about a session.
//
// A turn cap reached with nothing written is graded. A wall-clock timeout is an
// instrument failure. An unrecognised terminal reason is an instrument failure,
// because a silently new reason must not read as a score.

import type { ParsedSession } from '../stream/session-stream.types.ts';
import type { Classification, FailureKind, InitExpectation, RawSession } from './failure-classifier.types.ts';

const GRADED_REASONS = ['completed', 'max_turns'];
const AUTH_TEXT =
  /not logged in|\/login|authentication|invalid api key|unauthori[sz]ed|accounts\.google\.com\/o\/oauth2|sign in/i;
// An Antigravity write the headless mode could not prompt for: the process exits 0 having done nothing.
const DENIED_TEXT = /cannot prompt for|auto-denied/i;
const TIMEOUT_REASON = /^time-?d?_?out$/;
const RATE_TEXT = /usage limit|rate limit|too many requests|overloaded|quota/i;

function failure(kind: FailureKind, detail: string): Classification {
  return { outcome: 'instrument-failure', kind, detail };
}

function mismatch(label: string, actual: string, wanted: string | undefined): string[] {
  return wanted === undefined || actual === wanted ? [] : [`${label} ${actual}`];
}

function initProblems(parsed: ParsedSession, expectation: InitExpectation): string[] {
  const init = parsed.init;
  if (init === undefined) return ['no init event'];
  const unexpected = init.plugins.filter((plugin) => !expectation.expectedPlugins.includes(plugin));
  return [
    ...parsed.missingKeys,
    ...(init.apiKeySource === expectation.apiKeySource ? [] : [`apiKeySource ${init.apiKeySource}`]),
    ...mismatch('permission mode', init.permissionMode, expectation.permissionMode),
    ...mismatch('model', init.model, expectation.model),
    ...(init.skills.length === 0 ? [] : [`skills ${init.skills.join(',')}`]),
    ...(init.mcpServers.length === 0 ? [] : [`mcp servers ${init.mcpServers.join(',')}`]),
    ...unexpected.map((plugin) => `plugin ${plugin}`),
  ];
}

function resultFailure(parsed: ParsedSession, stderr: string): Classification | undefined {
  const result = parsed.result;
  if (result === undefined || !result.isError) return undefined;
  const words = `${result.text}\n${stderr}`;
  if (AUTH_TEXT.test(words)) return failure('authentication-failure', result.text);
  if (TIMEOUT_REASON.test(result.terminalReason)) return failure('wall-clock-timeout', result.terminalReason);
  if (RATE_TEXT.test(words)) return failure('rate-limit-exhausted', result.text);
  return failure('unrecognised-terminal-reason', `error result: ${result.terminalReason} ${result.text}`);
}

/** What a session that left no result says on stderr: a sign-in wall, or nothing nameable. */
function noResult(raw: RawSession): Classification {
  if (AUTH_TEXT.test(raw.stderr)) return failure('authentication-failure', raw.stderr.trim());
  return failure('no-parseable-stream', `${raw.parsed.unparsedLines} unparsed lines`);
}

function preStream(raw: RawSession): Classification | undefined {
  if (raw.declared !== undefined) return failure(raw.declared, 'named by a check outside the session');
  if (raw.spawnError !== undefined) return failure('host-binary-missing', raw.spawnError);
  if (raw.timedOut) return failure('wall-clock-timeout', 'the session outlived its wall-clock bound');
  if (DENIED_TEXT.test(raw.stderr)) return failure('permission-denied', raw.stderr.trim());
  return raw.parsed.result === undefined ? noResult(raw) : undefined;
}

/** The named failure a session shows before any init expectation is held to it, or undefined when it ran clean. */
export function sessionCause(raw: RawSession): Classification | undefined {
  return preStream(raw) ?? resultFailure(raw.parsed, raw.stderr);
}

export function classifySession(raw: RawSession, expectation: InitExpectation): Classification {
  const early = sessionCause(raw);
  if (early !== undefined) return early;
  const problems = initProblems(raw.parsed, expectation);
  if (problems.length > 0) return failure('init-assertion-failed', problems.join('; '));
  const reason = raw.parsed.result?.terminalReason ?? '';
  return GRADED_REASONS.includes(reason) ? { outcome: 'graded' } : failure('unrecognised-terminal-reason', reason);
}
