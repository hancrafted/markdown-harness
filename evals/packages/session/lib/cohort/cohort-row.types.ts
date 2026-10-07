/** One cohort row: every field required, no default. */
export type CohortRow = Readonly<Record<string, unknown>>;

export type CohortBuild =
  { readonly ok: true; readonly row: CohortRow } | { readonly ok: false; readonly missing: readonly string[] };

export type Pairing = { readonly ok: true } | { readonly ok: false; readonly differing: readonly string[] };
