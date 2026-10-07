// The evals/ platform gate, ambient half: the environment, the clock, randomness
// and the process exit. Pure Packages receive these as arguments.

import { randomBytes } from 'node:crypto';

export const environment = (): Readonly<Record<string, string | undefined>> => ({ ...process.env });
export const commandLineArguments = (): string[] => process.argv.slice(2);
export const nodeVersion = (): string => process.version;
export const nowMs = (): number => Date.now();
export const nowIso = (): string => new Date().toISOString();
export const randomHex = (bytes: number): string => randomBytes(bytes).toString('hex');
export const nodeExecutable = (): string => process.execPath;
export const writeOut = (text: string): void => void process.stdout.write(text);
export const writeErr = (text: string): void => void process.stderr.write(text);
export const exitWith = (code: number): never => process.exit(code);
