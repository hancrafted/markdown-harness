/**
 * What stderr should carry when a governed file will not open.
 *
 * A third thing stderr can say, after the usage text and the runtime floor's
 * refusal. Spec §2 rule 2 reads "stderr carries usage text only", and the floor
 * already stretched that before this did — the rule's real subject is the
 * SPLIT, that stdout carries the response and stderr never does, and a refusal
 * with no response to carry belongs on the failure channel or nowhere.
 *
 * Printing the usage text here instead, which is what `--check` did until now,
 * makes the two exit-2 flavours §2 rule 3 separates by channel report the same
 * thing on the same channel: an Operator whose invocation was fine is sent to
 * read a synopsis of the flags they got right, and nothing anywhere names the
 * file. The path is the whole of what makes this actionable.
 */

/**
 * Refuse a corpus one governed file could not be read from.
 *
 * @param path The path the read was attempted at, exactly as it was addressed.
 */
export function unreadableGovernedFile(path: string): string {
  return [
    `mh: cannot read ${path} — the config governs it, so this corpus has no verdict.`,
    ``,
    `A governed file that will not open has no verdict of its own, and a report`,
    `that left it out would read as a clean one. Refusing is the only answer that`,
    `cannot be quietly wrong.`,
    ``,
  ].join('\n');
}
