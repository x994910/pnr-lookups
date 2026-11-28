# MyPOI v3

The GitHub-updating review copy uses one local HTML. On open it reads engine-latest.json from the mypoi-v3-latest branch. The manifest specifies the engine and lookup/template assets at a Git commit and their SHA-384 hashes. It checks compatibility and the exact asset bytes before loading the engine in an isolated worker. Once loaded, one release is used for the whole open page session. Close and reopen to pick up updates.

The GitHub branch is the trust source for this copy. A branch editor could change both the manifest and assets. Hashes detect inconsistent or damaged downloads. They do not provide independent authorization. Keep write access limited and review manifest updates. The engine worker has no page DOM or clipboard access and runs under a network-blocking policy. The parent handles the existing internal office lookups, clipboard and form workflow.

Engine 1.0.2 includes the TIF additional-name correction. See RULES.md. Main retains the pinned engine 1.0.1 fallback. Test the new copy on the managed work computer and use the pinned fallback while workplace approval is pending.

## Future updates

1. Work on the mypoi-v3-latest branch. Change the engine source or reference data and add synthetic regression coverage as appropriate.
2. For changed engine code, build a new version with node build.cjs VERSION and run node build.cjs VERSION --check. Set MYPOI_TEST_BUNDLE to pnr-engine-VERSION.js for node --test tests/verify.cjs. Run node sync-loader.cjs --check. The local Edge workflow is available with node tests/latest-edge.cjs and uses engines 1.0.2 and 1.0.1 as test fixtures.
3. Commit the reviewed files. Run node make-latest.cjs COMMIT VERSION engine-latest-next.json, then replace engine-latest.json with that generated manifest and commit it. Publish both commits. No office HTML change is needed for compatible engine or asset changes.
4. Reopen the local HTML to confirm the displayed version. For rollback, regenerate the pointer for an earlier reviewed commit and version. A missing or failed download stops analysis. Use the separate pinned fallback copy when needed.
