/// <reference path="../rules.d.ts" />

// ARCH-012 — Module-Free Contracts: the two contract Packages name no Module.
//
// `contracts-name-no-module` reads the declared Module set out of
// `src/packages/cli/module-set.ts` — the one place Modules are composed — and
// refuses, in any `.ts` file under either contract Package, three spellings of
// a Module: an import reaching its Package, its config key as a string literal,
// and an identifier or code prefix carrying its name. Comments are blanked
// first, so prose describing the architecture stays writable; only code is held.
//
// Textual rather than `ctx.ast()`, deliberately: archgate transpiles before it
// parses, and every file in `config-contract` is type-only, so an AST rule sees
// an empty body there (trap 5). A regex over the source sees the types.
//
// FAILS CLOSED. A Module set the rule cannot read is a violation, never a pass:
// a derivation that found no Module would hold every contract to nothing.
// Self-contained by design: archgate forbids imports between rules files.

const MODULE_SET_FILE = 'src/packages/cli/module-set.ts';
const CONTRACT_GLOBS = ['src/packages/config-contract/**/*.ts', 'src/packages/response-contract/**/*.ts'];

/** A Module Package as `module-set.ts` imports it: `'../<package>/module.ts'`. */
const MODULE_IMPORT_RE = /from\s+['"]\.\.\/([a-z0-9-]+)\/module\.ts['"]/g;
/** The config key a descriptor declares: `key: '<key>'`. */
const DESCRIPTOR_KEY_RE = /\bkey:\s*['"]([a-z0-9-]+)['"]/;

interface DeclaredModule {
  pkg: string;
  key: string;
}

/** `body-structure` → `BodyStructure`: the stem a Module-named type carries. */
function pascalStem(key: string): string {
  return key
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

/** `body-structure` → `BODY_STRUCTURE__`: the prefix a Module's codes carry. */
function codePrefix(key: string): string {
  return `${key.toUpperCase().replaceAll('-', '_')}__`;
}

function escape(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Blank every comment while keeping line numbers: each comment character
 * becomes a space, each newline inside a block comment stays. A string literal
 * is skipped whole, so `'//'` inside one is not read as a comment opener.
 */
function stripComments(source: string): string {
  let out = '';
  let i = 0;
  while (i < source.length) {
    const ch = source[i];
    const next = source[i + 1];
    if (ch === '/' && next === '/') {
      while (i < source.length && source[i] !== '\n') {
        out += ' ';
        i += 1;
      }
    } else if (ch === '/' && next === '*') {
      const end = source.indexOf('*/', i + 2);
      const stop = end === -1 ? source.length : end + 2;
      out += source.slice(i, stop).replace(/[^\n]/g, ' ');
      i = stop;
    } else if (ch === "'" || ch === '"' || ch === '`') {
      let j = i + 1;
      while (j < source.length && source[j] !== ch) j += source[j] === '\\' ? 2 : 1;
      out += source.slice(i, j + 1);
      i = j + 1;
    } else {
      out += ch;
      i += 1;
    }
  }
  return out;
}

/** What one Module looks like written into code, each with the reason it is refused. */
function spellingsOf(module: DeclaredModule): { re: RegExp; what: string }[] {
  return [
    { re: new RegExp(`['"\`][^'"\`]*/${escape(module.pkg)}/[^'"\`]*['"\`]`), what: `an import of '${module.pkg}'` },
    { re: new RegExp(`['"\`]${escape(module.key)}['"\`]`), what: `the Module key '${module.key}'` },
    { re: new RegExp(`\\b\\w*${escape(pascalStem(module.key))}\\w*\\b`), what: `a type named for '${module.key}'` },
    { re: new RegExp(escape(codePrefix(module.key))), what: `a '${module.key}' code` },
  ];
}

async function declaredModules(ctx: RuleContext): Promise<DeclaredModule[] | undefined> {
  let source: string;
  try {
    source = await ctx.readFile(MODULE_SET_FILE);
  } catch {
    return undefined;
  }
  const modules: DeclaredModule[] = [];
  for (const match of source.matchAll(MODULE_IMPORT_RE)) {
    const pkg = match[1];
    let descriptor: string;
    try {
      descriptor = await ctx.readFile(`src/packages/${pkg}/module.ts`);
    } catch {
      return undefined;
    }
    const key = DESCRIPTOR_KEY_RE.exec(descriptor)?.[1];
    if (key === undefined) return undefined;
    modules.push({ pkg, key });
  }
  return modules.length > 0 ? modules : undefined;
}

export default {
  rules: {
    'contracts-name-no-module': {
      description:
        'No file under config-contract or response-contract names a declared Module in code: no import of a Module Package, no Module config key as a string literal, no identifier carrying a Module name, no Module-prefixed code. The Module set is read from cli/module-set.ts, and a set that cannot be read fails the rule.',
      severity: 'error',
      async check(ctx) {
        const modules = await declaredModules(ctx);
        if (modules === undefined) {
          ctx.report.violation({
            message: `Cannot read the declared Module set from ${MODULE_SET_FILE} — the contracts cannot be checked against nothing (ARCH-012 [contracts-name-no-module]).`,
            file: MODULE_SET_FILE,
          });
          return;
        }
        const spellings = modules.flatMap(spellingsOf);
        const files = (await Promise.all(CONTRACT_GLOBS.map((glob) => ctx.glob(glob)))).flat();
        for (const file of files) {
          const lines = stripComments(await ctx.readFile(file)).split('\n');
          lines.forEach((text, index) => {
            for (const { re, what } of spellings) {
              if (!re.test(text)) continue;
              ctx.report.violation({
                message: `A contract Package names ${what} — move the shape into that Module's Package and make the contract generic over it (ARCH-012 [contracts-name-no-module]).`,
                file,
                line: index + 1,
              });
            }
          });
        }
      },
    },
  },
} satisfies RuleSet;
