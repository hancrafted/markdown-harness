// Integration test for loadConfig across modules.

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { ModuleDescriptor } from '../../config-contract/index.ts';
import { loadConfig } from '../load-config.ts';

interface ModuleASection {
  dataA: string;
}

interface ModuleBSection {
  dataB: number;
}

let tempDir = '';
let validConfigPath = '';
let notYamlConfigPath = '';
let unrecognisedConfigPath = '';
let noModuleConfigPath = '';

const moduleA: ModuleDescriptor<ModuleASection> = {
  key: 'moduleA',
  validateSection(raw: unknown) {
    if (
      typeof raw === 'object' &&
      raw !== null &&
      'dataA' in raw &&
      typeof (raw as { dataA: unknown }).dataA === 'string'
    ) {
      return { section: raw as ModuleASection, faults: [] };
    }
    return { faults: [{ code: 'CONFIG_INVALID_VALUE', location: 'moduleA.dataA' }] };
  },
  claimsFor() {
    return [];
  },
};

const moduleB: ModuleDescriptor<ModuleBSection> = {
  key: 'moduleB',
  validateSection(raw: unknown) {
    if (
      typeof raw === 'object' &&
      raw !== null &&
      'dataB' in raw &&
      typeof (raw as { dataB: unknown }).dataB === 'number'
    ) {
      return { section: raw as ModuleBSection, faults: [] };
    }
    return { faults: [{ code: 'CONFIG_INVALID_VALUE', location: 'moduleB.dataB' }] };
  },
  claimsFor() {
    return [];
  },
};

const MODULE_SET = [moduleA, moduleB] as const satisfies readonly ModuleDescriptor<unknown>[];

beforeAll(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'foundation-load-config-'));

  validConfigPath = join(tempDir, 'valid.yaml');
  writeFileSync(validConfigPath, 'moduleA:\n  dataA: hello\nmoduleB:\n  dataB: 42\n');

  notYamlConfigPath = join(tempDir, 'not-yaml.yaml');
  writeFileSync(notYamlConfigPath, 'unclosed: [\n');

  unrecognisedConfigPath = join(tempDir, 'unrecognised.yaml');
  writeFileSync(unrecognisedConfigPath, 'moduleA:\n  dataA: hello\nunknownSection: true\n');

  noModuleConfigPath = join(tempDir, 'no-module.yaml');
  writeFileSync(noModuleConfigPath, 'unknownOnly: 123\n');
});

afterAll(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

describe('loadConfig', () => {
  describe('success cases', () => {
    it('loads valid config and hands each descriptor its own section back', () => {
      // ARRANGE
      const expectedA = { dataA: 'hello' };
      const expectedB = { dataB: 42 };
      // ACT
      const loaded = loadConfig(validConfigPath, MODULE_SET);
      const sectionA = loaded.config?.sectionFor(moduleA);
      const sectionB = loaded.config?.sectionFor(moduleB);
      // ASSERT
      expect(loaded.faults).toEqual([]);
      expect(sectionA).toEqual(expectedA);
      expect(sectionB).toEqual(expectedB);
    });

    it('returns undefined for an absent module section when other modules are valid', () => {
      // ARRANGE
      const partialConfigPath = join(tempDir, 'partial.yaml');
      const expectedSectionA = { dataA: 'onlyA' };
      const emptyFaults: readonly unknown[] = [];
      writeFileSync(partialConfigPath, 'moduleA:\n  dataA: onlyA\n');
      // ACT
      const loaded = loadConfig(partialConfigPath, MODULE_SET);
      const sectionA = loaded.config?.sectionFor(moduleA);
      const sectionB = loaded.config?.sectionFor(moduleB);
      // ASSERT
      expect(loaded.faults).toEqual(emptyFaults);
      expect(sectionA).toEqual(expectedSectionA);
      expect(sectionB).toBeUndefined();
    });
  });

  describe('failure cases', () => {
    it('reports CONFIG_NOT_FOUND when config path does not exist', () => {
      // ARRANGE
      const missing = join(tempDir, 'missing.yaml');
      const expected = [{ code: 'CONFIG_NOT_FOUND', location: missing }];
      // ACT
      const loaded = loadConfig(missing, MODULE_SET);
      // ASSERT
      expect(loaded.faults).toEqual(expected);
      expect(loaded.config).toBeUndefined();
    });

    it('reports CONFIG_UNREADABLE when path is a directory', () => {
      // ARRANGE
      const expected = [{ code: 'CONFIG_UNREADABLE', location: tempDir }];
      // ACT
      const loaded = loadConfig(tempDir, MODULE_SET);
      // ASSERT
      expect(loaded.faults).toEqual(expected);
      expect(loaded.config).toBeUndefined();
    });

    it('reports CONFIG_NOT_YAML when syntax is invalid', () => {
      // ARRANGE
      const expected = [{ code: 'CONFIG_NOT_YAML', location: notYamlConfigPath }];
      // ACT
      const loaded = loadConfig(notYamlConfigPath, MODULE_SET);
      // ASSERT
      expect(loaded.faults).toEqual(expected);
      expect(loaded.config).toBeUndefined();
    });

    it('reports CONFIG_UNRECOGNISED_KEY for unknown top-level keys', () => {
      // ARRANGE
      const expected = [{ code: 'CONFIG_UNRECOGNISED_KEY', location: 'unknownSection' }];
      // ACT
      const loaded = loadConfig(unrecognisedConfigPath, MODULE_SET);
      // ASSERT
      expect(loaded.faults).toEqual(expected);
      expect(loaded.config).toBeUndefined();
    });

    it('reports CONFIG_NO_MODULE_SECTION when no declared module key is present', () => {
      // ARRANGE
      const expectedCodes = ['CONFIG_UNRECOGNISED_KEY', 'CONFIG_NO_MODULE_SECTION'];
      // ACT
      const loaded = loadConfig(noModuleConfigPath, MODULE_SET);
      const codes = loaded.faults.map((f) => f.code);
      // ASSERT
      expect(codes).toEqual(expectedCodes);
      expect(loaded.config).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('guards variance: sectionFor answers only the requested module section', () => {
      // ARRANGE
      const propA = 'dataA';
      const propB = 'dataB';
      const loaded = loadConfig(validConfigPath, MODULE_SET);
      // ACT
      const sectionA = loaded.config?.sectionFor(moduleA);
      // ASSERT
      expect(sectionA).toHaveProperty(propA);
      expect(sectionA).not.toHaveProperty(propB);
    });

    it('guards composition: deliberate cross-wiring fails runtime checks', () => {
      // ARRANGE
      const rawB = { dataB: 100 };
      const validatedB = moduleB.validateSection(rawB);
      // ACT
      const crossWired = 'dataA' in (validatedB.section ?? {});
      // ASSERT
      expect(crossWired).toBe(false);
    });
  });
});
