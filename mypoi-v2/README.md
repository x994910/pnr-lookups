# MyPOI 2

Open `MyPOI.html` locally in a current Edge/Chrome-compatible browser. Internet access to this folder's raw GitHub files is required. Access to the original internal network services enables airport names and officer suggestions. The HTML needs no local installation or companion JavaScript/CSS files.

## Files to edit

| File | Purpose |
|---|---|
| `profile-codes.txt` | Profile dropdown values and labels, `value|label` per line. |
| `inter-cont.txt` | Port + airline contact rows. Keep CSV header; separate addresses with semicolons. |
| `nationalities.json` | Dropdown choices, name aliases and country-code mapping. |
| `airports.json` | Airport timezone/country mapping and NZ airport codes. |
| `poi-notes.txt` | Long POI notes template, used when copying POI. |
| `email-subject.txt` | Email subject with named placeholders. |
| `interdiction-email.txt` | Bilingual email body with named placeholders. |
| `MyPOI.html` | Inline record readers, calculation rules and the original interface. |
| `RULES.md` | Evidence, decisions, limitations and maintenance guidance. |
| `VERIFICATION.md` | Checks completed for this release and workplace checks outstanding. |
| `tests/verify.cjs` | Dependency-free Node regression tests for the released HTML. |

Initial profile/contact files are exact copies of the root files. The original HTML continues to use the root URLs; this version uses `mypoi-v2/`. Changes in one location do not automatically change the other. Do not delete or move the root files.

Templates use plain `{{field}}` placeholders, not JavaScript. Allowed email fields: al, surname, given, flightNo, arrPort, arrDate, gender, dob, nat, passNo, pnr. Unknown placeholders stop preparation. Templates are inserted as plain text; downloaded content is never evaluated as code.

Reference files load on opening the page; reload to apply edited dropdown/timezone data. Templates and contacts load on each relevant copy/preparation action. There are no embedded offline fallbacks. If a required download fails, the affected action stops and shows a message. Press Analyse to retry initial reference loading.

The passenger data is processed locally and never uploaded by this application. No email is sent. Copy buttons put the intended content onto the system clipboard; review it in the destination application before using it. Keep actual passenger data out of this public repository.

## Changes to calculation rules

Find the corresponding named reader or calculation in `MyPOI.html`; the pure `PNR` section is separate from the UI section. Add a synthetic regression test, document the source/rationale in `RULES.md`, and run `node tests/verify.cjs` from this folder on a development computer. Browser testing requires a separate development environment; the work computer only opens the HTML.

Reference-data edits are picked up online. Editing inline processing code requires downloading the updated HTML. No automatic remote-code updating is used.
