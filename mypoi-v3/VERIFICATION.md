# MyPOI v3 verification

- All 44 inherited parser and calculation tests passed.
- The build reproduced the checked-in bundle and the HTML integrity value.
- A local file opened in Microsoft Edge fetched the published engine from GitHub on Analyse. An incorrect integrity value was rejected, a subsequent retry succeeded, and another analysis reused the loaded engine.
- For a synthetic two-passenger overnight itinerary, v2 and v3 produced identical form values and all five clipboard payloads. The browser test substituted the internal port service, contact responses and clipboard API. It exercised passenger switching and observed HTTPS GET requests without PNR data.
- Managed office browser policy, the external bookmarklet, live internal services and the real clipboard destination still require workplace acceptance.

## Engine 1.0.1

- Isolate bookings and message-level itinerary fallback between UNH messages. Explicit non-PNRGOV message types are skipped. Fragment parsing remains supported.
- Leave a DOCS record unassigned when its explicit reference is missing from the booking or conflicts with the referenced traveller. Warn for manual review.
- Use only the selected locator's creation date and exclude bags explicitly assigned to a different flight.
- Six new synthetic regression tests cover these changes. Cancellation-only updates, check-in TRI correlation and sender-specific date or route policy need separate cases.
