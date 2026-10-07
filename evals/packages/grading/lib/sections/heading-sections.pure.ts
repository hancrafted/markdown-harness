// The heading splitter: where each heading's section begins and ends.
//
// A section runs from its heading line to the next heading at the same or a
// higher level (a smaller or equal level number). Hash lines inside a code fence
// or the leading frontmatter are not headings.

import type { HeadingScope, Section } from './heading-sections.types.ts';

const HEADING = /^(#{1,6})\s+(.*?)\s*#*\s*$/;
const FENCE = /^\s*(```|~~~)/;

interface Line {
  readonly text: string;
  readonly offset: number;
}

function lines(text: string): Line[] {
  let offset = 0;
  return text.split('\n').map((line) => {
    const entry = { text: line, offset };
    offset += line.length + 1;
    return entry;
  });
}

/** Where the leading frontmatter ends, as a line index; 0 when there is none. */
function frontmatterEnd(all: readonly Line[]): number {
  if (all[0]?.text !== '---') return 0;
  const close = all.findIndex((line, index) => index > 0 && line.text === '---');
  return close === -1 ? 0 : close + 1;
}

interface Opening {
  readonly level: number;
  readonly title: string;
  readonly start: number;
}

function openings(text: string): Opening[] {
  const all = lines(text);
  const found: Opening[] = [];
  let fenced = false;
  for (const line of all.slice(frontmatterEnd(all))) {
    if (FENCE.test(line.text)) fenced = !fenced;
    const match = fenced ? null : HEADING.exec(line.text);
    if (match !== null) found.push({ level: match[1].length, title: match[2], start: line.offset });
  }
  return found;
}

export function splitSections(text: string): Section[] {
  const found = openings(text);
  return found.map((opening, index) => {
    const next = found.slice(index + 1).find((later) => later.level <= opening.level);
    return { ...opening, end: next === undefined ? text.length : next.start };
  });
}

export function findSection(sections: readonly Section[], scope: HeadingScope): Section | undefined {
  const pattern = new RegExp(scope.titlePattern);
  return sections.find((section) => section.level === scope.level && pattern.test(section.title));
}
