# wiki — LLM_Wiki

<!-- expect: FAILS -->

TWO findings on one name, from one rule. The count is right, so both parts are judged: `wiki` is outside
the category's closed set and `LLM_Wiki` is not kebab-case. Every failing constraint reports rather than
stopping at the first, because an agent told only about the category would have to run the check again to
discover the slug.
