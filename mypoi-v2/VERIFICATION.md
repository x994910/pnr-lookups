# MyPOI 2 verification — 16 November 2026

**Implemented and tested locally; workplace integration remains unverified.**

- 44 pure parser/calculation regression tests passed with Node. Includes three published PNRGOV examples plus synthetic variants: escaped delimiters, configurable UNA separators, partial documents, infants, multiple passports, repeated names with distinct references, multiple bookings, historical data, codeshares, short locators, baggage totals/units, valid calendar dates, DST gaps and repeated hours, missing timezone/time, route ordering and template handling.
- 15 browser workflow checks passed in isolated Microsoft Edge with synthetic passenger data and controlled responses for GitHub/internal lookups. Verified form filling, nationality and NZ departure time, officer autocomplete, passenger edits, exact 29-field clipboard structure, raw-PNR preservation, email preparation without sending, stale-state invalidation, failed-reference retry, failed-template copy prevention and no JavaScript errors.
- Desktop and narrow-screen screenshots visually inspected. Original field arrangement and styling retained; narrow layout has no horizontal overflow.
- Captured application requests were GET lookups only, with no passenger data in URLs or bodies.
- Single HTML contains inline styles and scripts, no remote executable JavaScript, no local runtime companion files and no embedded reference/template fallbacks. Runtime network errors are surfaced in the page.
- Initial profile and contact copies checked against the original GitHub blob hashes. Original local source preserved separately.

The automated browser used mock responses for internal airport/employee services. They were not tested live; the owner confirms they function on the work network. Browser clipboard permissions and network policy on the actual work computer remain to be checked. No actual workplace PNR samples were supplied, so sender-specific variations cannot be certified. Published examples cover only a subset of the protocol.

## Workplace acceptance check

Open the replacement locally, confirm reference loading and officer suggestions, then compare a known approved PNR against expected passenger, flight, booking and NZ departure values. Include a multipassenger and an overnight-flight example. Check the copied output in its destination before operational use. Keep the previous HTML until that check passes. No change to the original HTML or original GitHub paths is required.

## Checkpoint

The new `mypoi-v2` folder is a separate release. `release.json` records local content hashes. GitHub commits record the added files; no existing repository file is overwritten. Re-run tests for changed rules before making subsequent releases.
