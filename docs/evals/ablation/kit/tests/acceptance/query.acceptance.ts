import { describe, expect, it } from 'vitest';
import { FIXTURE, runJson } from './run-cli';

const NOTHING_WRONG = 0;

/** The winning rule for anything under docs/reference/, and everything it asks. */
const RULE = {
  ruleId: 'reference',
  intent: 'Reference pages are looked up by slug and say how far they can be trusted',
};

const REQUIREMENTS = {
  fields: [
    {
      field: 'description',
      presence: 'required',
    },
    {
      field: 'draft',
      presence: 'forbidden',
      intent: 'Reference material ships finished or not at all',
    },
    {
      field: 'slug',
      pattern: '^[a-z0-9]+(-[a-z0-9]+)*$',
      intent: 'Slugs are lowercase words joined by single hyphens',
    },
    {
      field: 'status',
      allowed: [
        {
          value: 'draft',
          intent: 'Written down, not yet trusted.',
        },
        {
          value: 'stable',
          intent: 'Safe to rely on.',
        },
        {
          value: 'deprecated',
          intent: 'Still here, no longer to be followed.',
        },
      ],
    },
    {
      field: 'type',
      presence: 'required',
      allowed: [
        {
          value: 'reference',
          intent: 'Lookup data an agent consults rather than reads through.',
        },
      ],
    },
  ],
  unknownKeys: 'forbidden',
};

describe('mh --query', () => {
  it('re-exposes the winning rule and its requirements for a governed path', () => {
    const path = 'docs/reference/labels.md';
    const answer = { governance: 'governed', path, rule: RULE, requirements: REQUIREMENTS };

    const { status, stderr, body } = runJson(['--query', path, '--config', FIXTURE.validConfig]);

    expect(body.result).toEqual(answer);
    expect(status).toBe(NOTHING_WRONG);
    expect(stderr).toBe('');
  });

  it('answers a path nothing has written yet exactly as it answers one that exists', () => {
    const path = 'docs/reference/not-written-yet.md';
    const answer = { governance: 'governed', path, rule: RULE, requirements: REQUIREMENTS };

    const { status, body } = runJson(['--query', path, '--config', FIXTURE.validConfig]);

    expect(body.result).toEqual(answer);
    expect(status).toBe(NOTHING_WRONG);
  });

  it('answers invisible for a path every rule leaves alone', () => {
    const path = 'docs/research/vendor/upstream.md';
    const answer = { governance: 'invisible', path };

    const { status, body } = runJson(['--query', path, '--config', FIXTURE.validConfig]);

    expect(body.result).toEqual(answer);
    expect(status).toBe(NOTHING_WRONG);
  });

  it('echoes the path and the config the caller wrote', () => {
    const asked = { command: 'query', path: 'docs/reference/labels.md', config: FIXTURE.validConfig };

    const { body } = runJson(['--query', asked.path, '--config', asked.config]);

    expect({ command: body.command, path: body.path, config: body.config }).toEqual(asked);
  });
});
