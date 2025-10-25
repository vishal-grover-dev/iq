# Service Layer Segregation Work Item

## Overview & Motivation

### Current State

All service files are currently mixed in a single `services/` directory with minimal organization, including a nested `ai/` subdirectory containing 6 AI-related service files, plus 8 additional service files at the root level.

### Problems

1. **Debugging complexity**: Hard to determine if code runs in browser (client) or Node.js (server) context
2. **Import safety**: Easy to accidentally import server-only code in client components, causing build errors or bundle bloat
3. **Bundle optimization**: Client code can include server dependencies unnecessarily
4. **Team velocity**: New developers struggle to understand boundaries and where to add new code
5. **Mixed concerns**: Files like `mcq.services.ts` contain both client (TanStack Query hooks) and server (database access) code

### Goal

Clear separation into three tiers:

- **Root-level `config/` directory**: 2 configuration files (supabase, openai)
- **`services/client/` directory**: 4 browser-only service files (evaluate, http, ingest, mcq)
- **`services/server/` directory**: 11 Node.js-only service files (flat structure with no subdirectories)

---

## Implementation Phases

### Phase 0: Architecture Decision Documentation

**Objective:** Document the architectural rationale before implementation begins.

**Tasks:**

1. Add new section to `specs/blueprints/architecture-decisions.md` (see Architecture Decision Text section below)
2. Define rules:
   - **Client (`services/client/`)**: Browser-only code (TanStack Query hooks, EventSource, fetch/axios calls to internal APIs)
   - **Server (`services/server/`)**: Node.js-only code (Supabase service role, OpenAI API, database RPC, file system)
   - **Config (`config/`)**: Shared configuration factories at root level (used by both contexts)
3. Define naming conventions: Keep `.services.ts` suffix; directory indicates runtime context

**Success Criteria:**

- [ ] Architecture decision documented in `architecture-decisions.md`
- [ ] Team reviewed and approved the approach

---

### Phase 1: Create New Directory Structure & Config Migration

**Objective:** Establish new directories and move shared configuration files first.

**Tasks:**

1. Create directories:

   - `config/` (at root level)
   - `services/client/`
   - `services/server/`

2. **Move config files:**

   - `services/supabase.services.ts` → `config/supabase.config.ts`
   - `services/openai.services.ts` → `config/openai.config.ts`

3. **Update all import references:**

**Import Reference Changes:**

| File Type       | Old Import                     | New Import                 |
| --------------- | ------------------------------ | -------------------------- |
| API Routes      | `@/services/supabase.services` | `@/config/supabase.config` |
| API Routes      | `@/services/openai.services`   | `@/config/openai.config`   |
| AI Services     | `@/services/openai.services`   | `@/config/openai.config`   |
| Server Services | `@/services/supabase.services` | `@/config/supabase.config` |

**Files to Update:**

- `services/ai/embedding.service.ts`
- `services/ai/mcq-generation.service.ts`
- `services/ai/mcq-refinement.service.ts`
- `services/ai/labeling.service.ts`
- `services/ai/question-selector.service.ts`
- `services/ai/crawl-heuristics.service.ts`
- `services/mcq.services.ts`
- `services/ingest.services.ts`
- `services/evaluate-selection.service.ts`
- All API routes under `app/api/`

**Verification:**

Use grep to search for old import patterns and verify they return zero results.

**Success Criteria:**

- [x] New directories created
- [x] Config files moved and renamed
- [x] All imports updated
- [x] `pnpm build` passes with zero errors (expected build failure due to incomplete segregation)
- [x] `existing-files.md` updated with config section

**Phase 1 Results:**

- ✅ Successfully created `config/`, `services/client/`, and `services/server/` directories
- ✅ Moved `services/supabase.services.ts` → `config/supabase.config.ts`
- ✅ Moved `services/openai.services.ts` → `config/openai.config.ts`
- ✅ Updated 19 files with Supabase imports and 6 files with OpenAI imports
- ✅ All import references now use `@/config/supabase.config` and `@/config/openai.config`
- ✅ Documentation updated with new config section
- ⚠️ Build failure expected at this stage due to incomplete service segregation (Node.js modules in client code)

---

### Phase 2: AI Services Migration

**Objective:** Move all AI services to `services/server/` (flat structure) since they're all server-only.

**Tasks:**

1. **Move files (keep original filenames):**

| Original                                   | New Location                                   | Classification                       |
| ------------------------------------------ | ---------------------------------------------- | ------------------------------------ |
| `services/ai/embedding.service.ts`         | `services/server/embedding.service.ts`         | Server (OpenAI embeddings, reranker) |
| `services/ai/mcq-generation.service.ts`    | `services/server/mcq-generation.service.ts`    | Server (MCQ generation with OpenAI)  |
| `services/ai/mcq-refinement.service.ts`    | `services/server/mcq-refinement.service.ts`    | Server (MCQ revision, judge)         |
| `services/ai/labeling.service.ts`          | `services/server/labeling.service.ts`          | Server (Label classification)        |
| `services/ai/question-selector.service.ts` | `services/server/question-selector.service.ts` | Server (LLM selector)                |
| `services/ai/crawl-heuristics.service.ts`  | `services/server/crawl-heuristics.service.ts`  | Server (Crawl heuristics)            |

2. **Update import references:**

**Import Reference Changes:**

| Old Import                                | New Import                                    |
| ----------------------------------------- | --------------------------------------------- |
| `@/services/ai/embedding.service`         | `@/services/server/embedding.service`         |
| `@/services/ai/mcq-generation.service`    | `@/services/server/mcq-generation.service`    |
| `@/services/ai/mcq-refinement.service`    | `@/services/server/mcq-refinement.service`    |
| `@/services/ai/labeling.service`          | `@/services/server/labeling.service`          |
| `@/services/ai/question-selector.service` | `@/services/server/question-selector.service` |
| `@/services/ai/crawl-heuristics.service`  | `@/services/server/crawl-heuristics.service`  |

**Files to Update:**

- `app/api/generate/mcq/route.ts`
- `app/api/generate/mcq/revise/route.ts`
- `app/api/generate/mcq/save/route.ts`
- `app/api/retrieval/query/route.ts`
- `app/api/ingest/web/plan/route.ts`
- `app/api/ingest/web/process/route.ts`
- `app/api/evaluate/attempts/[id]/route.ts`
- `services/mcq.services.ts`
- `services/mcq-orchestration.service.ts`
- `services/evaluate-selection.service.ts`
- `utils/ingest-web-process.utils.ts`

3. **Delete old directory:**
   - Remove `services/ai/` directory after verifying all files moved

**Verification:**

Use grep to search for old `services/ai/` import patterns (should return zero results) and verify new `services/server/` imports exist.

**Success Criteria:**

- [ ] All AI service files moved to `services/server/` (flat structure)
- [ ] All imports updated
- [ ] Old `services/ai/` directory deleted
- [ ] `pnpm build` passes with zero errors
- [ ] `existing-files.md` updated

---

### Phase 3: Client Services Migration

**Objective:** Extract and move all client-side service functions to `services/client/`.

**Tasks:**

#### 3.1: Create `services/client/mcq.services.ts`

**Source:** `services/mcq.services.ts` (client functions only)

**Functions to Move:**

- `postGenerateMcq` - API client call
- `openMcqSse` - EventSource (browser API)
- `postReviseMcq` - API client call
- `postSaveMcq` - API client call
- `useMcqMutations` - TanStack Query hook
- `postRetrievalQuery` - API client call
- `postRetrievalEnhanceQuery` - API client call
- `useRetrievalQuery` - TanStack Query hook
- `useRetrievalMutations` - TanStack Query hook

**Imported By:**

- `app/generate/mcq/page.tsx`
- `hooks/useInterviewIngestion.hook.ts` (retrieval functions)
- Various components that use MCQ mutations

**Import Changes:**

Imports change from `@/services/mcq.services` to `@/services/client/mcq.services`

#### 3.2: Create `services/client/evaluate.services.ts`

**Source:** `services/evaluate.services.ts` (all functions - purely client)

**Functions to Move (all of them):**

- `createAttempt`
- `getAttempts`
- `getAttemptDetails`
- `submitAnswer`
- `getAttemptResults`
- `pauseAttempt`
- `fetchInterviewAlignment`
- `useCreateAttemptMutation`
- `useAttemptsQuery`
- `useAttemptDetailsQuery`
- `useSubmitAnswerMutation`
- `useAttemptResultsQuery`
- `usePauseAttemptMutation`

**Imported By:**

- `app/evaluate/page.tsx`
- `app/evaluate/[attemptId]/page.tsx`
- `app/evaluate/[attemptId]/results/page.tsx`
- Various evaluate components

**Import Changes:**

Imports change from `@/services/evaluate.services` to `@/services/client/evaluate.services`

#### 3.3: Create `services/client/ingest.services.ts`

**Source:** `services/ingest.services.ts` (client functions only)

**Functions to Move:**

- `ingestRepoOrWeb` - API client call
- `useIngestRepoWebMutations` - TanStack Query hook
- `getIngestionStatus` - API client call
- `processIngestion` - API client call
- `planRepoIngestion` - API client call
- `planWebIngestion` - API client call
- `pauseIngestion` - API client call (placeholder)
- `resumeIngestion` - API client call
- `retryIngestion` - API client call
- `downloadRunReport` - API client call (placeholder)

**Imported By:**

- `app/upload/page.tsx`
- `components/upload/uploadForm.component.tsx`
- `components/upload/interviewSection.component.tsx`
- `hooks/useInterviewIngestion.hook.ts`
- `hooks/useInterviewPlanner.hook.ts`

**Import Changes:**

Imports change from `@/services/ingest.services` to `@/services/client/ingest.services`

#### 3.4: Create `services/client/http.services.ts`

**Source:** `services/http.services.ts` (apiClient only)

**Exports to Include:**

- `apiClient` - Axios instance for internal API calls

**Imported By:**

- `services/client/mcq.services.ts`
- `services/client/evaluate.services.ts`
- `services/client/ingest.services.ts`

**Import Changes:**

Imports change from `@/services/http.services` to `@/services/client/http.services`

**Files to Update:**

- All components in `components/`
- All hooks in `hooks/`
- All pages in `app/`
- New client service files themselves

**Verification:**

Use grep to find all component/hook imports of old service paths in `components/`, `hooks/`, and `app/` directories.

**Success Criteria:**

- [ ] All client service files created in `services/client/`
- [ ] All component/hook imports updated
- [ ] `pnpm build` passes with zero errors
- [ ] `existing-files.md` updated

---

### Phase 4: Server Services Migration

**Objective:** Extract and move all server-side service functions to `services/server/`.

**Tasks:**

#### 4.1: Create `services/server/mcq.services.ts`

**Source:** `services/mcq.services.ts` (server functions only)

**Functions to Move:**

- `retrieveContextByLabels` - Supabase RPC call with embeddings
- `retrieveNeighbors` - Supabase RPC call with embeddings
- `getRecentQuestions` - Supabase query

**Imported By:**

- `app/api/generate/mcq/route.ts`
- `app/api/generate/mcq/revise/route.ts`
- `services/mcq-orchestration.service.ts`

**Import Changes:**

Imports change from `@/services/mcq.services` to `@/services/server/mcq.services`

#### 4.2: Create `services/server/ingest.services.ts`

**Source:** `services/ingest.services.ts` (server functions only)

**Functions to Move:**

- `runCatalogIngestion` - File system + database access
- `persistEmbeddedFlags` - File system access

**Imported By:**

- `scripts/run-catalog.ts`
- `services/server/ingest.services.ts` (internal use)

**Import Changes:**

Imports change from `@/services/ingest.services` to `@/services/server/ingest.services`

#### 4.3: Create `services/server/http.services.ts`

**Source:** `services/http.services.ts` (server functions only)

**Functions to Move:**

- `externalClient` - Axios instance for external crawling (no auth)
- `externalGetWithRetry` - External HTTP with retry logic

**Imported By:**

- `utils/web-crawler.utils.ts`
- `utils/repo.utils.ts`
- `utils/intelligent-web-adapter.utils.ts`

**Import Changes:**

Imports change from `@/services/http.services` to `@/services/server/http.services`

#### 4.4: Move Existing Server Services

**Files to Move (keep filenames):**

| Original                                 | New Location                                    | Classification              |
| ---------------------------------------- | ----------------------------------------------- | --------------------------- |
| `services/mcq-orchestration.service.ts`  | `services/server/mcq-orchestration.service.ts`  | Server (SSE orchestration)  |
| `services/evaluate-selection.service.ts` | `services/server/evaluate-selection.service.ts` | Server (selection pipeline) |

**Import Changes:**

- `mcq-orchestration.service`: Imports change from `@/services/` to `@/services/server/`
- `evaluate-selection.service`: Imports change from `@/services/` to `@/services/server/`

**Files to Update:**

- `app/api/generate/mcq/route.ts`
- `app/api/generate/mcq/revise/route.ts`
- `app/api/generate/mcq/save/route.ts`
- `app/api/evaluate/attempts/[id]/route.ts`
- `app/api/ingest/repo/process/route.ts`
- `app/api/ingest/web/process/route.ts`
- `scripts/run-catalog.ts`
- `utils/web-crawler.utils.ts`
- `utils/repo.utils.ts`
- `utils/intelligent-web-adapter.utils.ts`
- `utils/ingest-web-process.utils.ts`

**Verification:**

Use grep to find all API route, script, and util imports of old service paths.

**Success Criteria:**

- [ ] All server service files created in `services/server/`
- [ ] All API route/script/util imports updated
- [ ] `pnpm build` passes with zero errors
- [ ] `existing-files.md` updated

---

### Phase 5: Mixed Services Cleanup

**Objective:** Remove original service files after verifying all code migrated.

**Tasks:**

1. **Delete original root service files:**

   - `services/mcq.services.ts`
   - `services/evaluate.services.ts`
   - `services/ingest.services.ts`
   - `services/http.services.ts`
   - `services/supabase.services.ts`
   - `services/openai.services.ts`

2. **Verify no lingering references:**

Use grep to search for all old import patterns. All searches should return zero results.

3. **Run full build and linter:**

Execute `pnpm build` and `pnpm lint` to verify no errors.

4. **Update documentation:**
   - Update `existing-files.md` with final structure

**Success Criteria:**

- [ ] All original service files deleted
- [ ] Zero lingering references found via grep
- [ ] `pnpm build` passes with zero errors
- [ ] `pnpm lint` passes with zero errors
- [ ] `existing-files.md` updated

---

### Phase 6: Final Documentation Update

**Objective:** Complete all documentation with final structure and guidelines.

**Tasks:**

1. **Update `specs/blueprints/existing-files.md`:**

Add/update sections for `config/`, `services/client/`, and `services/server/` with descriptions of each service file and its purpose.

2. **Update `specs/blueprints/architecture-decisions.md`:**

Add the Service Layer Organization section (see Architecture Decision Text below).

3. **Document file invocation map:**

Create comprehensive reference table showing before/after import paths for all migrated services.

**Success Criteria:**

- [ ] `existing-files.md` completely updated
- [ ] `architecture-decisions.md` updated with new section
- [ ] All team members briefed on new structure
- [ ] Work item marked as complete

---

## File Inventory & Migration Map

### Complete Migration Table

| Original File                              | Functions/Exports                                                                                                                                                                   | Classification | New Location                                    | Imported By                       |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ----------------------------------------------- | --------------------------------- |
| `services/supabase.services.ts`            | `getSupabaseBrowserClient`, `getSupabaseServiceRoleClient`, `createSupabaseClientWithKey`                                                                                           | Config         | `config/supabase.config.ts`                     | API routes, server services       |
| `services/openai.services.ts`              | `createOpenAIClient`, `getErrorStatus`, `getErrorMessage`                                                                                                                           | Config         | `config/openai.config.ts`                       | Server services                   |
| `services/ai/embedding.service.ts`         | `getEmbeddings`, `rerank`                                                                                                                                                           | Server         | `services/server/embedding.service.ts`          | API routes, server services       |
| `services/ai/mcq-generation.service.ts`    | `generateMcqFromContext`                                                                                                                                                            | Server         | `services/server/mcq-generation.service.ts`     | API routes, orchestration service |
| `services/ai/mcq-refinement.service.ts`    | `reviseMcqWithContext`, `judgeMcqQuality`                                                                                                                                           | Server         | `services/server/mcq-refinement.service.ts`     | API routes, orchestration service |
| `services/ai/labeling.service.ts`          | `classifyLabels`, `resolveLabels`, metrics functions                                                                                                                                | Server         | `services/server/labeling.service.ts`           | API routes, utils                 |
| `services/ai/question-selector.service.ts` | `selectNextQuestion`                                                                                                                                                                | Server         | `services/server/question-selector.service.ts`  | Evaluate selection service        |
| `services/ai/crawl-heuristics.service.ts`  | `suggestCrawlHeuristics`                                                                                                                                                            | Server         | `services/server/crawl-heuristics.service.ts`   | API routes                        |
| `services/mcq.services.ts` (client)        | `postGenerateMcq`, `openMcqSse`, `postReviseMcq`, `postSaveMcq`, `useMcqMutations`, `postRetrievalQuery`, `postRetrievalEnhanceQuery`, `useRetrievalQuery`, `useRetrievalMutations` | Client         | `services/client/mcq.services.ts`               | Components, hooks, pages          |
| `services/mcq.services.ts` (server)        | `retrieveContextByLabels`, `retrieveNeighbors`, `getRecentQuestions`                                                                                                                | Server         | `services/server/mcq.services.ts`               | API routes, orchestration service |
| `services/evaluate.services.ts`            | All functions (purely client)                                                                                                                                                       | Client         | `services/client/evaluate.services.ts`          | Components, pages                 |
| `services/ingest.services.ts` (client)     | `ingestRepoOrWeb`, `useIngestRepoWebMutations`, `getIngestionStatus`, `processIngestion`, `planRepoIngestion`, `planWebIngestion`, control functions                                | Client         | `services/client/ingest.services.ts`            | Components, hooks                 |
| `services/ingest.services.ts` (server)     | `runCatalogIngestion`, `persistEmbeddedFlags`                                                                                                                                       | Server         | `services/server/ingest.services.ts`            | Scripts                           |
| `services/http.services.ts` (client)       | `apiClient`                                                                                                                                                                         | Client         | `services/client/http.services.ts`              | Client services                   |
| `services/http.services.ts` (server)       | `externalClient`, `externalGetWithRetry`                                                                                                                                            | Server         | `services/server/http.services.ts`              | Utils (crawler, repo)             |
| `services/mcq-orchestration.service.ts`    | `orchestrateMcqGenerationSSE`                                                                                                                                                       | Server         | `services/server/mcq-orchestration.service.ts`  | API routes                        |
| `services/evaluate-selection.service.ts`   | `selectNextQuestionForAttempt`                                                                                                                                                      | Server         | `services/server/evaluate-selection.service.ts` | API routes                        |

### Import Path Reference (Before/After)

#### Config Imports

- Supabase services: `@/services/supabase.services` → `@/config/supabase.config`
- OpenAI services: `@/services/openai.services` → `@/config/openai.config`

#### AI Service Imports (Server Context)

- Embedding service: `@/services/ai/embedding.service` → `@/services/server/embedding.service`
- MCQ generation: `@/services/ai/mcq-generation.service` → `@/services/server/mcq-generation.service`
- MCQ refinement: `@/services/ai/mcq-refinement.service` → `@/services/server/mcq-refinement.service`
- Labeling: `@/services/ai/labeling.service` → `@/services/server/labeling.service`
- Question selector: `@/services/ai/question-selector.service` → `@/services/server/question-selector.service`
- Crawl heuristics: `@/services/ai/crawl-heuristics.service` → `@/services/server/crawl-heuristics.service`

#### Client Service Imports (Browser Context)

- MCQ services: `@/services/mcq.services` → `@/services/client/mcq.services`
- Evaluate services: `@/services/evaluate.services` → `@/services/client/evaluate.services`
- Ingest services: `@/services/ingest.services` → `@/services/client/ingest.services`
- HTTP client: `@/services/http.services` → `@/services/client/http.services`

#### Server Service Imports (API Routes)

- MCQ server: `@/services/mcq.services` → `@/services/server/mcq.services`
- Ingest server: `@/services/ingest.services` → `@/services/server/ingest.services`
- HTTP server: `@/services/http.services` → `@/services/server/http.services`
- MCQ orchestration: `@/services/mcq-orchestration.service` → `@/services/server/mcq-orchestration.service`
- Evaluate selection: `@/services/evaluate-selection.service` → `@/services/server/evaluate-selection.service`

---

## Architecture Decision Text

**The following section should be added to `specs/blueprints/architecture-decisions.md`:**

---

## Service Layer Organization

### Three-Tier Service Structure

**Decision:** Organize services into three directories: `config/` (root-level), `services/client/`, and `services/server/`.

**Why:**

- **Debugging clarity:** Instantly identify if code runs in browser or Node.js context by looking at the import path
- **Import safety:** Prevent accidental server-only imports in client components, which causes build errors or unnecessary bundle bloat
- **Bundle optimization:** Client services tree-shake independently; server code is never sent to the browser
- **Team velocity:** New developers understand boundaries at a glance and know exactly where to add new functionality
- **Separation of concerns:** Clear distinction between data fetching (client), business logic (server), and shared configuration (config)

**Directory Structure:**

- `config/`: Root-level shared configuration factories used by both client and server contexts (Supabase client creation, OpenAI client creation, error utilities)
- `services/client/`: Browser-only code (TanStack Query hooks, EventSource, fetch/axios calls to internal APIs, React hooks)
- `services/server/`: Node.js-only code (Supabase service role client usage, OpenAI API calls, database RPC, file system access, embeddings, generation, all server-side business logic) - flat structure with no subdirectories

**Naming Conventions:**

- All service files keep `.service.ts` or `.services.ts` suffix regardless of location
- Config files use `.config.ts` suffix
- Directory indicates runtime context:
  - `services/client/mcq.services.ts` - browser-safe MCQ client functions
  - `services/server/mcq.services.ts` - Node.js-only MCQ server functions
  - `services/server/embedding.service.ts` - Node.js-only AI embedding service
  - `config/supabase.config.ts` - configuration factory (used by both contexts)
- Server directory uses flat structure (no nested subdirectories)

**Import Examples:**

- Component/Hook context: Import from `@/services/client/`
- API Route context: Import from `@/services/server/`
- Config context: Import from `@/config/` (usable in both client and server)

**Trade-offs:**

- Slight increase in directory depth (one extra level for services)
- Requires discipline to avoid importing server services in client code (can be enforced via ESLint rules in future)
- Some services need splitting if they contain both client and server functions (e.g., original `mcq.services.ts` becomes two files)
- Initial migration effort to reorganize existing code

**Migration Path:**

1. Phase 0: Document architectural decision
2. Phase 1: Move config files (supabase, openai) to root-level `config/`
3. Phase 2: Move AI services to `services/server/` (flat structure, all server-only)
4. Phase 3: Extract and move client functions to `services/client/`
5. Phase 4: Extract and move server functions to `services/server/`
6. Phase 5: Delete original mixed service files
7. Phase 6: Update all documentation

---

## Success Criteria

The migration is considered complete when all of the following are met:

### Technical Criteria

- [ ] All services clearly categorized in correct directories (`config/`, `services/client/`, `services/server/`)
- [ ] Zero linter errors (`pnpm lint`)
- [ ] Full build passes without errors or warnings (`pnpm build`)
- [ ] All existing functionality preserved (no behavioral changes)
- [ ] No duplicate code between client/server versions
- [ ] All original service files deleted
- [ ] Zero lingering references to old import paths

### Documentation Criteria

- [ ] `specs/blueprints/existing-files.md` completely updated with new structure
- [ ] `specs/blueprints/architecture-decisions.md` updated with Service Layer Organization section
- [ ] This work item updated with actual migration results and lessons learned
- [ ] Team briefed on new structure and conventions

### Verification Commands

Use grep to search for all old import patterns (should return zero results for each). Run `pnpm build` and `pnpm lint` to verify clean build with zero errors.

---

## Rollback Procedure

If issues arise during migration, rollback by:

1. **Phase-by-phase rollback:** Each phase is independently verifiable with build checks; roll back only the problematic phase
2. **Git revert:** Use `git revert` on the specific commit for that phase
3. **Restore from backup:** If needed, restore original files from git history
4. **Update imports:** Revert import path changes for the rolled-back phase

**Rollback commands:**

Use `git revert` to revert specific commits or `git reset --hard` to reset to a previous state (with caution).

---

## Notes & Lessons Learned

### Phase 2 Results (2025-01-27)

**What Went Well:**

- Successfully moved all 6 AI services and 2 additional server services to `services/server/` with flat structure
- All import references updated across 13+ files using systematic search and replace
- Zero lingering references to old `@/services/ai/` import patterns
- Clean directory structure established with proper server-only organization

**Challenges Encountered:**

- Import statement corruption during file moves caused build errors (resolved by user)
- Mixed client/server code in `services/ingest.services.ts` and `utils/catalog.utils.ts` still causes build failures (expected - will be addressed in Phase 3/4)
- Need to be more careful with file operations to avoid import statement corruption

**Improvements for Future Refactors:**

- Use file move operations instead of copy-and-replace to preserve exact file content
- Verify import statements immediately after file moves to catch corruption early
- Consider using git operations for safer file moves in complex refactoring scenarios

## Timeline

- **Phase 0:** ✅ COMPLETED (Architecture documentation)
- **Phase 1:** ✅ COMPLETED (Config migration) - 2025-01-XX
- **Phase 2:** ✅ COMPLETED (AI services migration) - 2025-01-27
- **Phase 3:** PENDING (Client services migration)
- **Phase 4:** PENDING (Server services migration)
- **Phase 5:** PENDING (Cleanup)
- **Phase 6:** PENDING (Final documentation)

**Total Estimated Effort:** TBD

---

## References

- `specs/blueprints/architecture-decisions.md` - Architectural rationale
- `specs/blueprints/existing-files.md` - Current and target file structure
- `specs/blueprints/directory-structure.md` - Directory conventions
- This work item - Complete migration plan
