/**
 * The report format version, as a NAME rather than a magic number.
 *
 * `format: 1` was misread as "which kind of report is this?" — a reasonable
 * misreading, because a bare integer beside `report: 'check'` looks like a
 * discriminant and carries nothing that says otherwise. `'v1'` cannot be read
 * that way, and it costs one character.
 *
 * A closed union rather than `string`, so a reader that switches on it is
 * checked exhaustively by the compiler and a new version cannot ship without
 * every consumer being made to look at it. It is one member today, which is what
 * a first version looks like.
 *
 * Shared by every versioned report, so bumping it is one edit rather than one
 * per report kind — and so the two can never drift into disagreeing about which
 * artifact they are.
 */
export type ReportFormat = 'v1';
