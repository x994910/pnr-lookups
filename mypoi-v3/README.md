# MyPOI v3

Open `MyPOI.html` as a local file in the office browser. It is the only office file. The first Analyse in each open page downloads the versioned engine, and the browser verifies its SHA-384 integrity before loading it. The verified engine stays in memory for subsequent analyses in that page. PNR processing runs in that browser. The existing office lookups and clipboard workflow are part of the HTML. GitHub also serves the reference and template files.

## Where to make a change

| Source | Responsibility |
| --- | --- |
| engine/syntax.js | EDIFACT envelope delimiters, tokenization and normalization helpers |
| engine/segment-readers.js | Date and time interpretation plus individual PNR segments |
| engine/booking.js | Booking boundaries, passenger/document association and segment context |
| engine/itinerary.js | NZ itinerary selection, timezone conversion and baggage assignment |
| engine/form-fields.js | Mapping parsed records and references into office form values |
| engine/templates.js | Contact matching and template substitution |

The build concatenates these source sections in order inside a private closure. The engine takes input and lookup data through arguments and has no network, DOM or storage dependency. The HTML owns downloads, form and clipboard interactions. See [RULES.md](RULES.md) for the inherited interpretation assumptions.

## Release workflow

1. For each translation issue, reproduce it with a synthetic fixture and record the expected interpretation and supporting specification. Preserve delimiters, references and context that cause the issue.
2. Edit the appropriate source section and add a regression in `tests/verify.cjs`. For a published engine change, set `ENGINE_FILE` in the HTML to a new versioned filename and keep old bundles available for old office copies.
3. Run `node build.cjs`, `node build.cjs --check` and `node --test tests/verify.cjs` from this directory. Commit the updated source, tests, generated engine and HTML together. The build updates the HTML integrity value. Share the new single HTML when deploying an engine change.
4. Validate in the managed office browser with the existing bookmarklet, office lookups and clipboard destination. Use the previous HTML to roll back. Public repository files and tests use synthetic examples.
