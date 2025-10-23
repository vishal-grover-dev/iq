# Linting Issues Remediation

## Overview

The codebase currently has **282 linting issues** (244 errors, 38 warnings) that need systematic remediation. This work item outlines a comprehensive approach to fix these issues properly without using `ts-nocheck` or other workarounds.

## Progress Log

| Phase               | Date       | Errors → | Warnings → | Build         | Notes                                                                                     |
| ------------------- | ---------- | -------- | ---------- | ------------- | ----------------------------------------------------------------------------------------- |
| P0 Baseline         | 2025-01-15 | 246      | 39         | ✓             | Baseline snapshot                                                                         |
| P1 Types Foundation | 2025-01-15 | 244      | 38         | ✗ (lint only) | Created shared API types, updated http/json utils                                         |
| P2 Core Utils & Web | 2025-01-15 | 226      | 38         | ✗ (lint only) | Fixed ingest-web-process, intelligent-web-adapter, repo, web-crawler, mcq-retrieval utils |
| P2 Domain Utils     | 2025-01-16 | 200      | 38         | ✗ (lint only) | Fixed evaluate-assignment-executor, evaluate-context-builder, evaluate-candidate-scorer   |

## Phase 2 — Impact Map & Changelog

### What Changed

- **`types/evaluate.types.ts`**: Refactored 6 types to interfaces (`IDistributions`, `ISimilarityMetrics`, `ICandidateWithSimilarity`, `IScoredCandidate`, `ISelectionCriteria`, `IQuestionAssignmentResult`); deleted unnecessary thin wrappers (`IPersistMcqResult`, `IEnsureQuestionAssignedResult`, `IRecentAttemptRow`, `TGeneratedMcqFallbackResult`)
- **`utils/ingest-web-process.utils.ts`**: Added `SupabaseClient` typing; replaced 6 `any` casts with proper types
- **`utils/ingest-preflight.utils.ts`**: Fixed error handling
- **`utils/intelligent-web-adapter.utils.ts`**: Fixed require() import (cheerio)
- **`utils/repo.utils.ts`**: Moved GitHub types to `types/ingestion.types.ts`
- **`utils/web-crawler.utils.ts`**: Added `Robot` type import from robots-parser
- **`utils/mcq-retrieval.utils.ts`**: Added database row interfaces
- **`utils/evaluate-assignment-executor.utils.ts`**: Replaced 9 `any` casts; improved error handling
- **`utils/evaluate-context-builder.utils.ts`**: Replaced 4 `any` casts; updated type references
- **`utils/evaluate-candidate-scorer.utils.ts`**: Replaced 5 `any` casts; improved error handling

### Files Modified

- `types/evaluate.types.ts` (added 7 interfaces/types for error handling and database rows)
- `types/ingestion.types.ts` (moved GitHub API types here)
- `utils/ingest-web-process.utils.ts` (6 any fixes)
- `utils/ingest-preflight.utils.ts` (1 error type fix)
- `utils/intelligent-web-adapter.utils.ts` (1 require + 1 any fixes)
- `utils/repo.utils.ts` (2 any fixes, updated imports)
- `utils/web-crawler.utils.ts` (2 any + 1 import fix)
- `utils/mcq-retrieval.utils.ts` (5 any fixes, added 3 interfaces)
- `utils/evaluate-assignment-executor.utils.ts` (9 any fixes)
- `utils/evaluate-context-builder.utils.ts` (4 any fixes)
- `utils/evaluate-candidate-scorer.utils.ts` (5 any fixes)

### Blast Radius

No breaking changes; all updates are internal type refinements. Functions maintain identical signatures and behavior.

### Issues Fixed

**46 issues** from Phase 2 (domains):

- 34 `any` type replacements across evaluate utilities
- 7 new type definitions for error/result handling
- 4 error type improvements (instanceof checks)
- 1 import correction (repo types moved)

### Behavior Unchanged

All runtime behavior identical; types only.

## Phase 1 — Impact Map & Changelog

### What Changed

- Created `types/app.types.ts`: Added `IApiResponse<T>`, `IPaginated<T>`, `TResult<T, E>`, `TDomainError` following conventions (I prefix for interfaces, T prefix for types).
- Deleted temporary files: `types/api.types.ts`, `types/error.types.ts`.
- Updated `utils/json.utils.ts`: Replaced `T = any` with constrained generic `T extends Record<string, unknown> = Record<string, unknown>`.
- Updated `services/http.services.ts`: Removed unused `config` parameter; replaced `err: any` with proper `AxiosError` type.

### Files Modified

- `types/app.types.ts` (added 21 lines)
- `utils/json.utils.ts` (improved generic constraint)
- `services/http.services.ts` (removed unused param, fixed error type)

### Blast Radius

No call site updates needed; generic constraint is backward-compatible and internal refactor.

### Issues Fixed

- `json.utils.ts` line 5: `any` → constrained generic (1 error)
- `http.services.ts` line 4: unused param removed (1 warning)
- `http.services.ts` line 47: `err: any` → `AxiosError` (1 error)

### Behavior Unchanged

Runtime behavior identical; types only.

## Issue Analysis

### Total Issues: 282

- **246 errors** (must fix)
- **39 warnings** (should fix)

### Issue Categories

#### 1. TypeScript `any` Type Issues (Majority - ~200+ instances)

- **@typescript-eslint/no-explicit-any**: Improper use of `any` type instead of proper TypeScript types
- **Files affected**: API routes, services, utilities, components
- **Impact**: Type safety, IntelliSense, refactoring

#### 2. Unused Variables and Imports (~30 instances)

- **@typescript-eslint/no-unused-vars**: Variables/imports defined but never used
- **Files affected**: Components, utilities, services
- **Impact**: Code cleanliness, bundle size

#### 3. React Hooks Dependencies (~5 instances)

- **react-hooks/exhaustive-deps**: Missing dependencies in useEffect hooks
- **Files affected**: React components
- **Impact**: Potential bugs, infinite re-renders

#### 4. JSX Entity Escaping (~5 instances)

- **react/no-unescaped-entities**: Unescaped quotes/apostrophes in JSX
- **Files affected**: React components
- **Impact**: Rendering issues, HTML validation

#### 5. Variable Declaration Issues (~5 instances)

- **prefer-const**: Variables that should use `const` instead of `let`
- **Impact**: Code clarity, immutability

## Files with Most Issues

### API Routes (app/api/)

- `evaluate/attempts/[id]/results/route.ts` - 12 issues
- `ingest/repo/process/route.ts` - 18 issues
- `generate/mcq/route.ts` - 9 issues
- Multiple other API files with 5-10 issues each

### Utilities

- `evaluate-assignment-executor.utils.ts` - 20+ issues
- `interview-streams.utils.ts` - 10+ issues
- `evaluate-candidate-scorer.utils.ts` - 10+ issues

### Services

- `evaluate-selection.service.ts` - 10+ issues
- `mcq-generation.service.ts` - 10+ issues
- Multiple other service files

### Components

- `upload/interviewRow.component.tsx` - 15+ issues
- Various component files with 5-10 issues each

## Remediation Strategy

### Phase 1: Foundation - Type Definitions

**Goal**: Establish proper type definitions before fixing implementations

1. **Create shared type definitions**

   - Domain-specific interfaces (User, Question, Attempt, etc.)
   - API request/response types with proper structure
   - Service layer interfaces matching actual business logic
   - Component prop types reflecting real component contracts

2. **Identify common patterns**

   - Database query results with specific field types
   - API request/response shapes based on actual endpoints
   - Error handling types for specific error scenarios
   - Configuration objects with known properties

3. **Create type utilities**
   - Generic API response wrapper with proper constraints
   - Pagination types with specific data structures
   - Filter/search parameter types matching actual usage

### Phase 2: Utility Functions

**Goal**: Fix type safety in utility functions

1. **Start with core utilities**

   - `json.utils.ts`
   - `vector.utils.ts`
   - `url.utils.ts`

2. **Fix domain-specific utilities**

   - `evaluate-*.utils.ts` files
   - `ingest-*.utils.ts` files
   - `mcq-*.utils.ts` files

3. **Approach for each file**:
   - Define specific interfaces for function parameters based on actual data
   - Create return types that match the real return values
   - Replace `any` with domain-specific types and proper generics

### Phase 3: Service Layer

**Goal**: Ensure type safety in business logic

1. **Fix services in dependency order**

   - `supabase.services.ts` (database layer)
   - `http.services.ts` (HTTP client)
   - `ai/*.service.ts` (AI services)
   - Domain services (`evaluate-*.service.ts`, `mcq-*.service.ts`)

2. **For each service**:
   - Define request/response interfaces
   - Create proper error types
   - Use generics for reusable patterns

### Phase 4: API Routes

**Goal**: Type-safe API handlers

1. **Create API type definitions**

   - Request body types
   - Response types
   - Path parameter types
   - Query parameter types

2. **Fix routes systematically**

   - `/api/evaluate/*` routes
   - `/api/generate/*` routes
   - `/api/ingest/*` routes

3. **Handle Next.js specific types**
   - `NextRequest`/`NextResponse` types
   - Route handler parameter types

### Phase 5: React Components

**Goal**: Clean, type-safe components

1. **Fix React-specific issues**

   - JSX entity escaping
   - Hook dependencies
   - Component prop types

2. **Remove unused variables**

   - Unused imports
   - Unused local variables
   - Unused function parameters

3. **Improve component patterns**
   - Proper prop typing
   - Event handler typing
   - State management typing

### Phase 6: Final Cleanup

**Goal**: Ensure no regressions

1. **Run comprehensive linting**

   - Fix any remaining issues
   - Verify all categories are addressed

2. **Type checking**

   - Ensure no TypeScript errors
   - Verify type coverage

3. **Testing**
   - Run existing tests
   - Ensure functionality preserved

## Implementation Guidelines

### TypeScript Best Practices

1. **Avoid `any` at all costs**

   - Create specific interfaces and types for each use case
   - Use generics for reusable patterns with proper constraints
   - Define domain-specific types that match actual data structures
   - Use type guards only when absolutely necessary for runtime validation

2. **Proper error handling**

   - Create specific error types
   - Use type guards for runtime validation
   - Avoid throwing untyped errors

3. **Generic constraints**

   ```typescript
   // Instead of: (data: any) => any
   interface ProcessableData {
     id: string;
     [key: string]: string | number | boolean;
   }

   function processData<T extends ProcessableData>(data: T): T {
     // Now we have proper typing and IntelliSense
     console.log(data.id); // ✅ Type-safe
     return data;
   }
   ```

4. **API and Data Type Definitions**

   ```typescript
   // ❌ Before: Using any everywhere
   function handleApiResponse(response: any): any {
     return response.data.map((item: any) => item.process());
   }

   // ✅ After: Proper type definitions
   interface ApiResponse<T> {
     success: boolean;
     data: T[];
     message?: string;
   }

   interface User {
     id: string;
     name: string;
     email: string;
   }

   function handleApiResponse(response: ApiResponse<User>): User[] {
     return response.data.map((user) => ({
       ...user,
       name: user.name.toUpperCase(), // ✅ Full IntelliSense
     }));
   }
   ```

### React Best Practices

1. **Hook dependencies**

   ```typescript
   useEffect(() => {
     // Use functional updates for dependencies
     const handler = () => setCount((c) => c + 1);
     element.addEventListener("click", handler);
     return () => element.removeEventListener("click", handler);
   }, []); // Empty dependency array when handler doesn't need props/state
   ```

2. **Component props**
   ```typescript
   interface UserProfileProps {
     user: {
       id: string;
       name: string;
       email: string;
     };
     onUpdate: (user: UserProfileProps["user"]) => void;
     isLoading?: boolean;
   }
   ```

### Code Organization

1. **Type-only imports**

   ```typescript
   import type { User, ApiResponse } from "./types";
   ```

2. **Barrel exports for types**
   ```typescript
   // types/index.ts
   export type { User, ApiResponse } from "./user";
   export type { Config } from "./config";
   ```

## Success Criteria

- **Zero linting errors** (246 errors fixed)
- **Zero or minimal warnings** (39 warnings addressed)
- **No `ts-nocheck` directives**
- **No `any` types** (except in rare cases with explicit documentation)
- **TypeScript strict mode compatible**
- **All functionality preserved**

## Risk Mitigation

1. **Gradual rollout**: Fix files in dependency order
2. **Testing at each phase**: Ensure functionality works
3. **Backup strategy**: Git branches for rollback if needed
4. **Documentation**: Update type definitions as reference

## Resources Needed

- **Time estimate**: 2-3 weeks for comprehensive fix
- **Team members**: 1-2 developers familiar with the codebase
- **Tools**: TypeScript, ESLint, IDE with good TypeScript support
- **Testing**: Access to development environment for validation

## Next Steps

1. Set up development environment with strict TypeScript checking
2. Create type definition files for common patterns
3. Start with Phase 1 (Foundation) - establish core types
4. Progress through phases systematically
5. Regular check-ins to ensure progress and catch issues early
