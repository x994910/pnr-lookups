# MyPOI 2 interpretation rules

This is a targeted PNRGOV EDIFACT extraction tool, not a universal PNR validator or an immigration decision engine. User-entered operational decisions are not inferred. It supports the fields required by the existing MyPOI screen. Uncertain information is left blank or accompanied by a review message.

## Evidence and scope

Primary specification: [WCO-hosted IATA/A4A PADIS PNRGOV EDIFACT Implementation Guide 17.1](https://www.wcoomd.org/-/media/wco/public/global/pdf/topics/facilitation/instruments-and-tools/tools/api-guidelines-and-pnr-doc/pnrgov-edifact-implementation-guide-17_1.pdf). Relevant sections: UNA (4.1), DAT (5.4), RCI (5.17), SSR (5.23), TBD (5.24), TIF (5.25), TRA (5.27), TVL (5.29), and the examples in Appendix B. This version is the documented baseline, not a claim that every sender uses that version. Message layouts and airline variants require representative input to validate fully.

The original attachment was reviewed end-to-end. Its layout and output contract are preserved; its parsing assumptions are not treated as authoritative.

## Record readers

| Record | Reading rule | Reason / test coverage |
|---|---|---|
| UNA / delimiters | Respect service delimiters and release characters; also accept one segment per line. | Prevent escaped punctuation in names from splitting records. |
| SRC | Begin a distinct booking. | Passenger reference numbers can repeat in different bookings. |
| TIF | Read surname and given-name components separately; retain traveller reference. | Identity must not be determined solely from display name. |
| SSR DOCS | Read slash-delimited document fields and explicit traveller references. | Link by reference first, exact normalised name second; retain incomplete documents. |
| RCI | Read locator and creation date when supplied. | A locator does not require a date to be valid. |
| DAT | Do not use a last-transaction date as booking creation date. | Prevent update dates becoming false booking dates. |
| TVL / TRA / RPI | Read itinerary fields, retain booked and operating carriers and booking status. | Support codeshares, exclude explicitly cancelled/unavailable segments; flag incomplete travel. |
| TBD | Read piece count, total weight and unit; associate by available passenger context. | Do not multiply total weight by number of bags or label pounds as kilograms. |
| SAC | Exclude subsequent historical records until a new booking/message. | Old flights and documents must not overwrite current fields. |
| IFT / ADD / LTS | Extract known travel-agency forms. | Preserve original agency extraction without treating arbitrary remarks as agency names. |
| SSD / SSR SEAT / FOP / MON | Retain parsed records internally. | Original UI does not expose separate seat/payment fields; raw PNR remains in the POI output. |

## Deliberate application rules (not universal protocol rules)

- Use the first identified inbound international NZ flight within the selected booking after sorting by verified UTC departure instants. If any instant is unavailable, retain source order and warn. A message-level flight is used only when the booking has no itinerary flights and exactly one header flight exists.
- Build the connected route preceding that arrival; show its origin and final two transit points. Warn about disconnected routes or extra transit points. Return date is the first subsequent NZ departure to a non-NZ airport.
- Display the booked flight number. Keep operating-carrier information and issue a codeshare warning so the operator can check the contact. The contact file uses two-character airline keys; longer/unsupported codes yield no contact rather than a guessed recipient.
- TVL wall-clock times are interpreted using the airport's IANA timezone. Browser `Intl` supplies historical timezone/DST rules. Departure is converted to Pacific/Auckland; arrival is retained as supplied local airport time. Missing/unknown zones, nonexistent clocks and repeated DST clocks leave NZ departure blank. Never relabel an unconverted local time as NZ time. An arrival date is not fabricated from the optional variation field.
- Two-digit birth years are interpreted as the most recent nonfuture year, based on the current year. Other two-digit dates use a rolling 100-year window ending 49 years in the future. Centenarian birth dates cannot be resolved from two digits alone: verify manually. Full dates are calendar-validated.
- Keep distinct traveller references even when names match. Repeated identical document data is deduplicated; multiple different passports are not silently resolved. No fuzzy identity matching. Where there is no reference and names differ, separate records may remain and require review.
- Strip recognised separated name titles. For uppercase TIF names, also recognise common attached title suffixes (an airline convention). This can be ambiguous for genuine names ending in those letters; DOCS names take precedence. Do not apply attached-title stripping to DOCS names.
- In a multipassenger booking, unassigned baggage remains blank with a message instead of assigning the booking total to every passenger. Pooling is labelled. Unknown weight units remain unknown.
- Required-field glow remains advisory as in the original. This tool does not establish eligibility, make boarding decisions, validate passport authenticity or verify the accuracy of supplied PNR data.

## Layout and output compatibility

The existing fieldsets, fields, buttons, dropdown labels, responsive grids and colours are retained. Added status messages explain loading/interpretation failures. Time selects now include a blank value, so missing times do not look like midnight. The email header says prepared, not sent. Selecting another passenger preserves that passenger's in-session edits. Editing raw PNR clears old results. Editing fields invalidates copied-POI/email preparation state.

POI clipboard: exactly 29 single-line values in original order, followed by raw PNR, `---NEXT---`, then `poi-notes.txt`. The notes text and bilingual email text are carried forward from the supplied HTML, not independently approved as legal guidance or translation. The existing wording is preserved. Email is copy-only; nothing is sent by this tool.

## External data and maintenance

- `profile-codes.txt` and `inter-cont.txt`: exact initial copies of the repository root files on 16 November 2026; root files and URLs remain unchanged. These copies are now independently maintained.
- `nationalities.json`: original dropdown and aliases plus a derived ISO lookup from [datasets/country-codes](https://github.com/datasets/country-codes), retrieved 16 November 2026. CSV was parsed with quoted-field support. Only matches to the original dropdown are accepted; unmapped codes remain blank. Special British/UN/stateless entries are explicitly listed. Original terminology is preserved.
- `airports.json`: reduced IATA/timezone/country data from [mwgg/Airports](https://github.com/mwgg/Airports), retrieved 16 November 2026; MIT licence in `AIRPORT-LICENSE.txt`. Conflicting duplicate airport codes are excluded. This community reference is not the PNR format authority. Check unexpected airport mappings against the relevant airport/carrier before changing them.
- Airport display names and officer names still use the original internal HTTP services. No assumption is made that they are broken because they are unavailable outside work.
- No remote JavaScript is loaded or evaluated. Online files are JSON or plain text. No embedded data/template fallbacks, service worker, persistent lookup cache or passenger storage. Reload fetches reference data; copy actions fetch current templates/contacts. Data already loaded remains in memory for the current session.
- All requests are GETs to fixed reference addresses; no names, documents, PNRs or entered values are placed into request paths, queries or bodies. No email transmission. Ordinary network request metadata is still visible to the hosting services.

## How to diagnose a future failure

Record the failing segment type, an anonymised input preserving delimiters, expected result, actual result, timezone/date and whether a lookup failed. Locate the corresponding `readTIF`, `readDOCS`, `readTVL`, `readRCI`, `readTBD`, `route` or timezone function in the single HTML. Add a failing regression case before changing that rule, cite the format section or sender-specific evidence, and rerun core and browser tests. Do not solve a parsing defect by rearranging the screen or introducing a cloud PNR upload.

Known verification boundary: tests use published examples and synthetic records. No real workplace PNR samples or live internal service session were available. Support for arbitrary message histories, all airline extensions and all versions is not claimed. The workplace browser and actual sender variants still need an acceptance check.
