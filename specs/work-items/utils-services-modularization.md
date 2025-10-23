# Work Item: Utils → Services Refactoring (Phase 5)

## Executive Summary

The `utils/` directory contains **12 files that violate the architecture principle** distinguishing services from utilities. These files make external API/DB calls and should be consolidated into existing services or created as new ones.

**Recommended Approach**: Revised Consolidation Strategy

- ✅ Extend 4 existing services (8 files)
- ✅ Create 2 new services (4 files, consolidated)
- ✅ Result: 6-9 days, -30% files, improved architecture clarity
- ✅ Single source of truth maintained

---

## Architecture Principle

From `specs/blueprints/architecture-decisions.md`:

> **Services** = API-facing functions only (JSDoc required)
> **Utils** = Pure helpers without side effects

**Violation**: 12 utils files make external API/DB calls → should be services

---

## Problem Analysis: 12 Files Requiring Refactoring

### Category 1: LLM/AI Integration (1 file)

**`utils/label-resolver.utils.ts`** (130 lines)

- Calls `classifyLabels()` → OpenAI API
- Maintains in-memory classification cache
- Exports metrics tracking functions
- **Action**: Consolidate into `services/ai/labeling.service.ts`

### Category 2: Database Operations (2 files)

**`utils/mcq-retrieval.utils.ts`** (103 lines)

- Calls `retrieval_hybrid_by_labels` RPC
- Calls `retrieval_mcq_neighbors` RPC
- Queries `mcq_items` table
- **Action**: Consolidate into `services/mcq.services.ts`

**`utils/ingest-preflight.utils.ts`** (43 lines)

- Reads/writes `documents` table
- Updates catalog JSON file
- **Action**: Consolidate into `services/ingest.services.ts`

### Category 3: Orchestration & Ingestion (2 files)

**`utils/interview-streams.utils.ts`** (320 lines)

- Orchestrates catalog-driven ingestion with concurrency
- Calls `ingestRepoOrWeb()` API
- Polls ingestion status
- Performs database preflight checks
- **Action**: Create `services/ingestion-orchestration.service.ts`

**`utils/ingest-web-process.utils.ts`** (182 lines)

- Processes web content with filtering/assessment
- Involves external processing calls
- **Action**: Consolidate into `services/ingest.services.ts`

### Category 4: Evaluation Pipeline (4 files from Phase 4)

**`utils/evaluate-attempt-guard.utils.ts`** (95 lines)

- Fetches from `user_attempts` and `attempt_questions` tables
- Validates attempt state against database

**`utils/evaluate-context-builder.utils.ts`** (122 lines)

- Queries database for distributions and recent attempts
- Calculates topic balancing from DB

**`utils/evaluate-candidate-scorer.utils.ts`** (138 lines)

- Calls `retrieval_mcq_neighbors` RPC
- Performs embedding-based scoring

**`utils/evaluate-assignment-executor.utils.ts`** (377 lines)

- Calls `generateMcqFromContext()` AI service
- Persists MCQ to database
- Handles generation retries

**Action**: Consolidate all 4 into `services/evaluate-selection.service.ts` (already orchestrates these 5 pipeline stages)

### Category 5: HTTP/External Calls (3 files)

**`utils/repo.utils.ts`** (94 lines)

- Fetches from GitHub API
- Lists repository files

**`utils/web-crawler.utils.ts`** (198 lines)

- Makes HTTP requests to crawl websites
- Respects robots.txt

**`utils/intelligent-web-adapter.utils.ts`** (125 lines)

- Makes HTTP requests for content extraction
- Quality checks with external dependencies

**Action**: Consolidate all 3 into `services/source-fetcher.service.ts`

---

## Files Correctly Placed in Utils ✓

These should remain in `utils/` (pure helpers, no side effects):

✅ `tailwind.utils.ts` - CSS utility helpers  
✅ `upload.utils.ts` - Text/filename processing  
✅ `langchain.utils.ts` - PDF text chunking  
✅ `ingest.utils.ts` - Chapter extraction  
✅ `vector.utils.ts` - Vector math (cosine similarity)  
✅ `catalog.utils.ts` - Loading and filtering catalogs  
✅ `mcq.utils.ts` - MCQ hashing and text normalization  
✅ `json.utils.ts` - Safe JSON parsing  
✅ `animation.utils.ts` - Animation constants and hooks  
✅ `static-ontology.utils.ts` - Loading static JSON file  
✅ `selection.utils.ts` - Weighted random selection  
✅ `url.utils.ts` - URL normalization and parsing  
✅ `ingest-planner.utils.ts` - Planning helpers  
✅ `mcq-prompts/` - Prompt building helpers (pure text generation)

---

## Revised Consolidation Strategy

### Consolidation Groups

#### Group A: Extend `services/ai/labeling.service.ts`

- Consolidate: `label-resolver.utils.ts` (130 LOC)
- Add caching + metrics tracking logic
- New exports: `resolveLabels()`, `getLabelResolverMetrics()`, `resetLabelResolverMetrics()`
- Result: Single source for all label operations

#### Group B: Extend `services/mcq.services.ts`

- Consolidate: `mcq-retrieval.utils.ts` (103 LOC)
- Add Section 2: MCQ Data Retrieval
- New exports: `retrieveContextByLabels()`, `retrieveNeighbors()`, `getRecentQuestions()`
- Result: Generation + retrieval co-located

#### Group C: Extend `services/ingest.services.ts`

- Consolidate: `ingest-preflight.utils.ts` (43 LOC)
- Consolidate: `ingest-web-process.utils.ts` (182 LOC)
- Add Section 2: Ingestion Server Logic
- New exports: `persistEmbeddedFlags()`, `processWebContent()`
- Result: Comprehensive ingestion service

#### Group D: Merge into `services/evaluate-selection.service.ts`

- Consolidate: 4 evaluate utils files (732 LOC)
- Already orchestrates these pipeline stages
- Organize by stage: Guard → Context → Bank → Scoring → Assignment
- Result: ~1,100 LOC orchestrator (logically organized)
- Single source of truth for entire evaluation pipeline

#### Group E: NEW `services/ingestion-orchestration.service.ts`

- Move: `interview-streams.utils.ts` (320 LOC)
- Purpose: Catalog ingestion orchestration
- Justification: Complex orchestration deserves own service
- Follows pattern of `evaluate-selection.service.ts`

#### Group F: NEW `services/source-fetcher.service.ts`

- Consolidate: `repo.utils.ts` (94 LOC)
- Consolidate: `web-crawler.utils.ts` (198 LOC)
- Consolidate: `intelligent-web-adapter.utils.ts` (125 LOC)
- Combined: 417 LOC unified source fetching
- All serve same purpose: fetch external data for ingestion

---

## Implementation Plan (Revised)

### Phase 5a: Extend AI Labeling Service (1 day)

- Consolidate `label-resolver.utils.ts` → `ai/labeling.service.ts`
- Add in-memory caching and metrics tracking
- Import updates: 5-7 files

### Phase 5b: Extend MCQ Service (1 day)

- Consolidate `mcq-retrieval.utils.ts` → `mcq.services.ts`
- Add Section 2: MCQ Data Retrieval functions
- Import updates: 8-10 files

### Phase 5c: Extend Ingest Service (1-2 days)

- Consolidate `ingest-preflight.utils.ts` → `ingest.services.ts`
- Consolidate `ingest-web-process.utils.ts` → `ingest.services.ts`
- Add Section 2: Ingestion Server Logic
- Import updates: 6-10 files

### Phase 5d: Merge into Evaluate Selection (1-2 days)

- Consolidate 4 evaluate utils into `evaluate-selection.service.ts`
- Organize by 5 pipeline stages + orchestrator
- Import updates: 2-4 files (mostly internal)

### Phase 5e: Create Ingestion Orchestration (1 day)

- NEW: `services/ingestion-orchestration.service.ts`
- Move `interview-streams.utils.ts` logic
- Import updates: 5-8 files

### Phase 5f: Create Source Fetcher (1 day)

- NEW: `services/source-fetcher.service.ts`
- Consolidate 3 fetcher utils
- Import updates: 9-15 files

**Total Effort**: 6-9 days | **Phases can run in parallel after Phase 5a**

---

## File Mapping: 12 Utils → Services

| Utils File                              | Consolidate Into                     | Type   | LOC |
| --------------------------------------- | ------------------------------------ | ------ | --- |
| `label-resolver.utils.ts`               | `ai/labeling.service.ts`             | EXTEND | 130 |
| `mcq-retrieval.utils.ts`                | `mcq.services.ts`                    | EXTEND | 103 |
| `ingest-preflight.utils.ts`             | `ingest.services.ts`                 | EXTEND | 43  |
| `ingest-web-process.utils.ts`           | `ingest.services.ts`                 | EXTEND | 182 |
| `evaluate-attempt-guard.utils.ts`       | `evaluate-selection.service.ts`      | MERGE  | 95  |
| `evaluate-context-builder.utils.ts`     | `evaluate-selection.service.ts`      | MERGE  | 122 |
| `evaluate-candidate-scorer.utils.ts`    | `evaluate-selection.service.ts`      | MERGE  | 138 |
| `evaluate-assignment-executor.utils.ts` | `evaluate-selection.service.ts`      | MERGE  | 377 |
| `interview-streams.utils.ts`            | `ingestion-orchestration.service.ts` | NEW    | 320 |
| `repo.utils.ts`                         | `source-fetcher.service.ts`          | NEW    | 94  |
| `web-crawler.utils.ts`                  | `source-fetcher.service.ts`          | NEW    | 198 |
| `intelligent-web-adapter.utils.ts`      | `source-fetcher.service.ts`          | NEW    | 125 |

**Total**: 1,726 LOC | **Files to eliminate**: 12 | **New files**: 2 | **Extensions**: 8

---

## Import Pattern Updates

### Current Pattern (Before)

```typescript
import { resolveLabels } from "@/utils/label-resolver.utils";
import { retrieveContextByLabels } from "@/utils/mcq-retrieval.utils";
import { persistEmbeddedFlags } from "@/utils/ingest-preflight.utils";
import { fetchAttemptOrFail } from "@/utils/evaluate-attempt-guard.utils";
import { runCatalogIngestion } from "@/utils/interview-streams.utils";
import { crawlWebsite } from "@/utils/web-crawler.utils";
```

### New Pattern (After)

```typescript
import { resolveLabels } from "@/services/ai/labeling.service";
import { retrieveContextByLabels } from "@/services/mcq.services";
import { persistEmbeddedFlags } from "@/services/ingest.services";
import { fetchAttemptOrFail } from "@/services/evaluate-selection.service";
import { runCatalogIngestion } from "@/services/ingestion-orchestration.service";
import { crawlWebsite } from "@/services/source-fetcher.service";
```

**Files requiring updates**: ~30 across:

- `app/api/ingest/**/*.ts` (4 routes)
- `app/api/generate/**/*.ts` (3 routes)
- `app/api/evaluate/**/*.ts` (4 routes)
- `app/api/retrieval/**/*.ts` (2 routes)
- `services/**/*.ts` (6 services)
- `scripts/**/*.ts` (2 scripts)

---

## Success Criteria

✅ All 12 files consolidated/moved  
✅ 4 services extended with new functions  
✅ 2 new services created  
✅ All imports updated with zero build errors  
✅ No new linting errors introduced  
✅ Playwright tests pass unchanged  
✅ `specs/blueprints/existing-files.md` updated  
✅ Architecture cleanly separates:

- **Services**: API calls, database operations, orchestration
- **Utils**: Pure helpers, calculations, formatting

---

## Risk Assessment

**Risk Level**: 🟢 **LOW** (pure refactoring, no behavioral changes)

**Why Low Risk**:

- All functions maintain identical signatures
- Pure move/extend operations
- No logic changes
- All existing tests should pass

**Testing Strategy**:

1. Full build after each phase: `pnpm build`
2. Linting check after phase completions
3. Playwright test suite for integration tests
4. Git diff verification (only import changes + file moves)

---

## Recommendation

✅ **ADOPT REVISED CONSOLIDATION STRATEGY**

**Why**:

1. Leverages existing services (DRY principle)
2. 10 fewer files (-30% reduction)
3. 3 days faster implementation
4. Better codebase organization
5. Clearer import paths (fewer services to know about)
6. Easier maintenance (related code co-located)
7. Same architectural benefit (clear service vs utils separation)

---

## Post-Refactoring

- **Documentation**: Update `specs/blueprints/existing-files.md` with new structure
- **Linting**: Run full build to verify no new linting errors
- **Testing**: Run Playwright tests to ensure no behavioral changes
- **Commit**: Clear message: "Phase 5: Consolidate utils to services (8 extensions + 2 new)"

---

## Notes

- This is a **pure refactoring** with no behavioral changes
- Each phase can be completed independently
- Phases 5b-5f can run in parallel after 5a
- All existing tests and functionality should remain unchanged
- Total LOC moved: 1,726 (same as original plan)
- Total files eliminated: 12 utils files
- Final architecture: 14 utils + 15 services = 29 files (vs 33 before)
