/**
 * The one answer every read in this repository comes back as.
 *
 * Three states rather than two, and the third is the point. A path with
 * nothing at it is a file someone may be about to write; a path holding
 * something that will not open is a file that exists and cannot be reported
 * on, which is a repair someone owes. Collapsing them would tell a caller to
 * proceed against a file that is really there.
 *
 * What each state MEANS is deliberately not settled here. `--assess` turns
 * `absent` into ordinary advice and `unreadable` into a finding; `--check`
 * refuses the whole corpus on either; the config loader maps them onto two
 * different catalog codes. The gate reports what it found and the caller owns
 * the policy.
 */

export type FileRead =
  /** The file's contents. */
  | { kind: 'text'; text: string }
  /** Nothing is at that path. An ordinary answer, never a failure by itself. */
  | { kind: 'absent' }
  /** Something is there and will not open: a directory, a permission refusal, a symlink that loops. */
  | { kind: 'unreadable' };
