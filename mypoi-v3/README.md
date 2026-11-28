# MyPOI v3

The current published office release uses engine 1.0.1. This branch proposes the signed-update loader and Case #1 correction. Start with [Signed release design and maintenance](SIGNED-RELEASE.md) for review, provisioning, tests, signing, publication and rollback.

| Source | Responsibility |
| --- | --- |
| engine/syntax.js | EDIFACT delimiters, tokenization and normalization |
| engine/segment-readers.js | Dates, times and segment decoding |
| engine/booking.js | Booking and passenger/document association |
| engine/itinerary.js | Itinerary, timezone and baggage decisions |
| engine/form-fields.js | Parsed records to office form values |
| engine/templates.js | Contact matching and template rendering |
| release-loader.js | Signed metadata, asset verification and isolated engine channel |
| MyPOI.html | Local form, office lookups and clipboard |

Use [RULES.md](RULES.md) for interpretation details. Keep historical bundles available for existing local HTML copies and signed rollback.
