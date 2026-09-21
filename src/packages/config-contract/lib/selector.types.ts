// The selector vocabulary: how a rule says which files it is about.
//
// Its own file rather than a section of `config.types.ts`, because it is the
// one part of the config language a second Module would reach for unchanged —
// a selector is Core vocabulary, while the rest of that file is the frontmatter
// Module's own section shape.

/**
 * How a rule says which files it is about: two axes of literal tokens, and no
 * wildcard anywhere.
 *
 * Both keys are optional in the TYPE and at least one is mandatory in a CONFIG,
 * which is the one illegal state this language leaves representable on purpose.
 * Making it unrepresentable would need a two-member union, and a union is what
 * the old `path` / `fileName` pair was — it put both keys on both members as
 * `never`, so every reader of a rule had to ask which half it was looking at.
 * One flat object with one validator rule is cheaper to read and cheaper to
 * widen, and `CONFIG_SELECTOR_MISSING` is what holds the rule.
 *
 * A rule selects the PRODUCT of the two axes, and an absent axis means every:
 * folders alone is every file in those folders, names alone is that name
 * anywhere in the corpus, and both together is those names in those folders.
 *
 * The payoff is host-independence. A literal token compares the same way on
 * every filesystem, while the platform's glob matcher turns case-insensitive
 * inside any segment carrying a wildcard — so the same config used to produce a
 * different report on macOS than on Linux, with nothing anywhere saying why.
 * See `docs/design-adr/0007-selector-is-two-literal-axes.md`.
 */
export interface Selector {
  /**
   * Folders this rule is about, each selecting THAT FOLDER ALONE.
   *
   * There is no recursion anywhere in this language: a folder token never
   * reaches a subfolder, so a subtree is never governed by accident and the
   * folder list is an enumeration its author maintains. The accepted cost is
   * that a folder created under a governed parent is governed by nothing until
   * the list is edited, and the tool says nothing.
   */
  folders?: readonly FolderPath[];

  /**
   * File names this rule is about, each one literal basename.
   *
   * On its own a name reaches the whole corpus, which is what lets a reserved
   * filename be governed with no folder list at all — and it is the one axis
   * that keeps reaching into folders created after the config was written.
   */
  fileNames?: readonly FileName[];
}

/**
 * One folder, repo-root-relative, carrying a MANDATORY trailing `/`.
 *
 * The trailing separator is not decoration. It is what makes a folder token
 * unmistakable for a file name at a glance, and what keeps one folder spelled
 * one way — `docs/vision` and `docs/vision/` naming the same folder would be
 * two tokens the config text could not compare. The corpus root is `./`, its
 * own token rather than the empty string, so every folder has a spelling.
 *
 * A token missing its trailing `/`, or written with any other decoration, is
 * `CONFIG_INVALID_VALUE` at the `folders` key.
 */
export type FolderPath = string;

/**
 * One literal basename, extension included, compared CASE-SENSITIVELY.
 *
 * Case-sensitive deliberately and on every host, matching what the corpus walk
 * already does with `.md` — so `INDEX.md` is not `index.md` on a machine whose
 * filesystem would happily confuse them, and a stored response compares equal
 * on another machine.
 *
 * A name carrying a separator is `CONFIG_INVALID_VALUE` at the `fileNames`
 * key: it is not a basename, and it could never match anything.
 */
export type FileName = string;
