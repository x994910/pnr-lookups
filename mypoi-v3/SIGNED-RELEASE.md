# MyPOI signed-update candidate

## Review status

The existing office release is commit `4f7f91d`, engine 1.0.1. Its local HTML pins an engine filename and hash and fetches reference files from a fixed Git revision. The candidate keeps the single local HTML and the existing office integrations. It changes engine and data selection to a signed release pointer. The candidate HTML intentionally has an empty trust key and fails closed. Deploy only after user review and workplace IT approval. No production signature, pointer or GitHub change is part of the candidate.

## Case #1

Before: `given: stripTitle(c[0], true)`

After: `given: [stripTitle(c[0], true), clean(c[4]), clean(c[5])].filter(Boolean).join(' ')`

IATA PNRGOV EDIFACT MIG 21.1, section 5.27, printed page 58, defines two optional Other names (9754) after the infant indicator in C324. The parser keeps the established matching rules. A shorter later check-in TIF with the same reference reuses its reservation passenger. Synthetic cases cover children’s passenger-type handling, ordinary names, two additional names, multiple references and contradictory SSR documents. The real office record was not exported or rerun in this candidate test.

## Trust and threat model

The pointer is fetched once per page session. It carries a base64 encoding of the exact UTF-8 JSON payload and an ECDSA P-256/SHA-256 signature in IEEE P1363 format. The HTML imports a separately provisioned SPKI public key with Web Crypto. The signed payload binds approval status, publication and expiration dates, monotonic release sequence, compatible loader and API, exact Git commit, semantic bundle version, filenames and SHA-384 hashes for the engine and seven assets. Only the fixed GitHub repository and valid commit-addressed paths are used. Signed metadata is checked before fetching executable content. Assets are verified before engine startup. Publication needs both an independent signing decision and GitHub access. The workflow borrows freshness and rollback concepts from TUF and does not implement TUF's delegated and threshold roles.

The browser executes the engine inside a blob worker created in an opaque-origin sandboxed iframe. Its inherited CSP denies network connections and external scripts. The worker has no page DOM or clipboard API. A dedicated message port carries structured results to the UI. The engine receives pasted PNR text and needed lookup data locally. Application downloads carry no PNR text. The existing internal lookups remain in the parent page. The worker test confirms that the fetch probe did not reach its server. Isolation also depends on the browser and its policy. A malicious approved engine could still falsify results or template outputs through its legitimate channel, or consume CPU and memory. Review signed source and data, including email recipients. An altered local HTML, compromised browser, extension, OS or signing key is outside this protection.

The loader remembers the highest authenticated pointer sequence and exact payload digest in memory and attempts to save them in local storage. `file:` storage behavior varies by browser, profile and path. Deletion, relocation, concurrent tabs and clock manipulation weaken replay resistance. The provisioned sequence floor protects a fresh copy back to its initial approved pointer. The seven-day maximum validity bounds replay of otherwise eligible signed metadata with a trustworthy clock. There is no persistent offline last-known-good cache. If GitHub, signatures, compatibility, asset integrity or isolation checks fail, a new session stops analysis. A session keeps its selected release and checks expiry before subsequent operations. No mid-analysis switch occurs.

Rotation or revocation of the independent key requires supplying a replacement trusted HTML through the approved channel. An existing HTML cannot independently learn that its sole trusted key has been revoked. Stop use and withdraw the old HTML if that key is compromised. Consider a TUF implementation with threshold and offline root roles if IT requires centrally managed revocation, stronger rollback persistence or longer asset approval windows.

## Signing and publication after approval

1. Reproduce each Notion issue with synthetic data, update the relevant source, run all tests and have the change independently reviewed. Use a new bundle version for changed code. Run `node build.cjs VERSION`, `node build.cjs VERSION --check`, `node sync-loader.cjs --check` and `node --test tests/verify.cjs tests/release-security.cjs`. Set `MYPOI_TEST_BUNDLE` to the versioned bundle being reviewed for later releases.
2. Publish the reviewed code, versioned bundle and data to an immutable Git commit. Check that its exact raw assets are accessible through the office route. An ordinary commit has no effect on the centrally selected release.
3. On an approved signing workstation, sign exactly that commit. For an IT-approved external P-256 PEM key, set the process-local environment variable `MYPOI_SIGNING_KEY_FILE` to the approved key path outside the checkout. Run `node sign-release.cjs COMMIT VERSION SEQUENCE EXPIRES_UTC engine-release.json`. The script hashes Git blobs rather than checkout files, writes only the signed envelope and refuses to overwrite an output file. If IT requires a hardware signer, have it sign the exact payload bytes and emit the same P1363 signature format. Do not copy private keys to the repository, CI, office HTML or documentation.
4. Commit the reviewed signed pointer to `main/mypoi-v3/engine-release.json` after the referenced commit is published. Confirm the live pointer and immediately smoke-test a provisioned local HTML. Use a unique increasing sequence for every pointer, including expiry renewals. Schedule signing and publication before the short approval window expires.
5. For the initial office distribution only, run `node provision-loader.cjs APPROVED_PUBLIC_KEY.pem FIRST_SEQUENCE MyPOI-office.html`, verify the public key fingerprint out of band and distribute the resulting HTML through the approved office channel. Officers can save it as MyPOI.html. Future compatible releases become visible when anyone reopens that HTML.

### Rollback

Keep every approved immutable target. To restore an earlier compatible engine, have it independently reviewed again and sign its exact older commit and version with a **new higher sequence** and `--rollback`. Publish that pointer and verify that the loader marks it as an approved rollback. Publish a renewed higher sequence if signing dates need to change. Copying an old pointer back can trigger replay rejection. During an initial rollout incident, workplace IT can withdraw the candidate and restore the separately retained 1.0.1 office HTML under its original policy.

## Verification and office acceptance

- Published baseline had 50/50 native regressions. Two of the new name tests reproduced the defect with 1.0.1. The candidate passed 54 translation tests and six security tests.
- Node security cases covered valid signatures, altered and unsigned metadata, wrong keys, expired or future metadata, incompatible loader/API, sequence replay and reuse, higher-sequence rollback, modified assets, missing files, interrupted downloads, unavailable host and unavailable browser cryptography.
- Microsoft Edge opened the unhosted local HTML with an ephemeral in-memory signing key and a local fixture server standing in for the GitHub release transport. It loaded the signed release, verified reuse within one session, loaded a higher sequence after reopening the page, rejected replay, and blocked a worker fetch probe before it reached the server. The probe found no DOM or clipboard API. The browser workflow exercised passenger selection, manual edits, mocked internal port/user lookups, and v2 parity for all five clipboard payloads including the 29 fields and notes. The clipboard sink was mocked.
- Before deployment, test managed Edge policy for file URL Web Crypto, CSP and blob workers, storage across close/reopen, GitHub access to the real signed pointer and immutable assets, the actual bookmarklet, live office lookups and real clipboard paste destinations. Recheck the original Case #1 through the approved office environment.

The Windows Edge fixture can be rerun with `node tests/signed-edge.cjs`. Set `MYPOI_EDGE` for a non-default Edge path and `MYPOI_SCREENSHOT` to save a synthetic screenshot. This is a separate browser check from the native Node suite.
