## Ingestion Reliability Hardening (React docs pilot)

### Context

- Recent catalog runs showed many completed ingestions with 0 documents/chunks due to URL fragment duplicates, intra-run races on the same page, and generic label fallback. Base URL issues were also seen in CLI runs.

### Problems observed

- Multiple catalog entries pointed to the same page (hash fragments), causing dedup to drop later jobs.
- 32 parallel jobs raced to write the same paths; unique (bucket, path) guard made many runs end with 0 docs.
- Generic subtopic derivation (e.g., "Learn") overshadowed explicit subtopics.
- CLI baseURL misconfiguration initially returned invalid URL errors.

### Recommended fixes (design)

1) Normalize and dedupe seeds before enqueue
   - Strip URL fragments and query, normalize protocol/host, and lower-case host.
   - Only enqueue one job per normalized path; mark all catalog entries that map to the same path as covered.

2) Preflight skip for existing documents
   - Before creating an ingestion, check `documents` for (bucket='web', path=normalized URL).
   - If present, set `embedded=true` in the catalog and do not create an ingestion.

3) Concurrency control by domain/path groups
   - Keep overall concurrency, but batch same-host or same-path groups to avoid intra-run conflicts on the same page.

4) Stronger completion check and retry
   - After "completed", verify document and chunk counts increased; if not and page is not present, retry once with a longer crawl delay and log reason.

5) Precise labeling
   - Prefer explicit subtopic from metadata/catalog; ignore generic buckets (Learn/Guide/Docs/Tutorial).
   - For react.dev `reference/*`, label as `Reference/<leaf>`.

6) Observability & docs
   - Log resolved baseURL in CLI, per-item state transitions, and final coverage counts.
   - Set `documents.num_pages` for HTML to a sensible proxy (e.g., `chunks.length`).

### Execution plan (tasks)

- [ ] Implement seed normalization and catalog-level pre-dedupe in runner.
- [ ] Add preflight check (skip if `documents(bucket='web', path=normalized)` exists) and update catalog without enqueuing.
- [ ] Group work items by hostname/path key; process groups sequentially within a host to avoid races; keep cross-host concurrency.
- [ ] Enhance completion verification and add a single retry with increased crawl delay.
- [ ] Persist `documents.num_pages = chunks.length` for web ingestions during processing.
- [ ] Confirm label refinements (explicit subtopic preferred; generic buckets suppressed; `Reference/<leaf>` mapping for react.dev) across a sample run.
- [ ] Update README with a short "Reset and re-run" section (no SQL), referencing scripts and checks.

### One-time validation run (operator playbook)

Note: keep commands and SQL out of this document; follow the repo scripts referenced.

1) Reset environment
   - [ ] Stop any running ingestion jobs.
   - [ ] Clear ingestion-related tables using the provided database script (documents, document_chunks, ingestions, ingestion_events). Do not modify migrations.
   - [ ] Verify tables are empty via the helper script (counts only).

2) Reset catalog
   - [ ] Set `embedded=false` for all entries in `data/interview-ingest-catalog.json` using a quick JSON edit or helper script.
   - [ ] Commit changes.

3) Run catalog pilot (React only)
   - [ ] Start dev server.
   - [ ] Execute the catalog CLI with controlled concurrency.
   - [ ] Observe logs for enqueue → process → completed per item; ensure baseURL is printed.

4) Verify coverage
   - [ ] Use the database helper script to fetch per-ingestion document and chunk counts for the window of the run.
   - [ ] Confirm that all normalized unique paths show non-zero chunks; duplicates should have been preflight-skipped.
   - [ ] Spot-check labels on a few documents for correct subtopics (no generic "Learn").

5) Mark success
   - [ ] Ensure the catalog file has `embedded=true` for processed entries.
   - [ ] Capture a brief note in this document with the date and high-level counts.

### Notes

- Do not include raw SQL here; use `scripts/db.sh` to run prepared queries/files as needed.
- Keep migrations immutable; any schema change must be a new migration file.


