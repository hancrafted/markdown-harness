# aikb — a slug so long that it runs past the fifty character cap

<!-- expect: FAILS -->

56 characters against `maxLength: 50`, so `FILE_NAMES__VALUE_TOO_LONG` fires. The slug is valid
kebab-case, so this is the only finding: a length bound and a form bound answer different questions about
the same string.
