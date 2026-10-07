// The envelope every Host harness's stream shares: split into rows, parse each as a JSON object, find the init
// and result lines, stamp the events with their sequence, count what was not JSON and name the keys that were not
// there. A Host harness supplies only its dialect. It never reads an exit code.

import { missingFrom, parseLine } from './json-values.pure.ts';
import type { Json } from './json-values.types.ts';
import type { ParsedSession, SessionEvent } from './session-stream.types.ts';
import type { StreamDialect } from './stream-envelope.types.ts';

function missingKeys(dialect: StreamDialect, initLine: Json | undefined, resultLine: Json | undefined): string[] {
  return [
    ...missingFrom(initLine && dialect.initBody(initLine), dialect.initKeys, 'init'),
    ...missingFrom(initLine, dialect.initLineKeys, 'init'),
    ...missingFrom(resultLine && dialect.resultBody(resultLine), dialect.resultKeys, 'result'),
  ];
}

export function assembleStream(text: string, dialect: StreamDialect): ParsedSession {
  const rows = text.split('\n').filter((row) => row.trim() !== '');
  const parsed = rows.map(parseLine).filter((line): line is Json => line !== undefined);
  const initLine = parsed.find(dialect.isInit);
  const resultLine = parsed.find(dialect.isResult);
  const init = initLine && dialect.initFacts(initLine);
  const { drafts, unexpectedShapes } = dialect.drafted(parsed, init);
  return {
    events: drafts.map((draft, seq) => ({ ...draft, seq }) as SessionEvent),
    init,
    result: resultLine && dialect.resultFacts(resultLine, init),
    unparsedLines: rows.length - parsed.length,
    missingKeys: missingKeys(dialect, initLine, resultLine),
    unexpectedShapes,
  };
}
