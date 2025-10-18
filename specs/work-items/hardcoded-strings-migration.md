# Hardcoded Strings Migration - Comprehensive Audit & Refactoring Plan

## Executive Summary

This document provides a comprehensive audit of hardcoded strings across the IQ codebase and outlines a systematic migration plan to refactor these strings into strongly typed constants, enums, and type definitions. The migration aims to improve maintainability, reduce duplication, and establish consistent patterns for string management.

## Project Context

- **Project**: Intelliqent Questions (IQ) - B2C interview-prep platform
- **Tech Stack**: Next.js 15+, TypeScript, React 19, Supabase, OpenAI
- **Audit Date**: January 2025
- **Scope**: All modules excluding documentation and configuration files

## Migration Principles

1. **Zero Logic Changes**: Only refactor string literals without altering business logic
2. **Type Safety**: Use TypeScript enums and const assertions for compile-time safety
3. **Consistent Naming**: Follow established conventions (`E` for enums, `I` for interfaces, `T` for types)
4. **Hierarchical Organization**: Group related strings by domain/feature
5. **Backward Compatibility**: Maintain all existing functionality during migration

## Refactoring Plan

### Phase 1: Core Infrastructure (Week 1)

#### Task 1.1: Create Module-Specific Constants and Types Architecture

- [x] Create `types/navigation.types.ts` for navigation-related enums
- [x] Create `constants/navigation.constants.ts` for navigation constants
- [x] Create `types/ui.types.ts` for UI-specific enums and types
- [x] Create `constants/theme.constants.ts` for theme-related constants
- [x] Create `types/generation.types.ts` for generation-related enums
- [x] Create `constants/generation.constants.ts` for generation constants
- [x] Create `constants/evaluate.constants.ts` for evaluation constants
- [x] Create `types/ingestion.types.ts` for ingestion-related enums
- [x] Create `constants/ingestion.constants.ts` for ingestion constants
- [x] Establish naming conventions and module-specific structure

#### Task 1.2: Create Type Definitions

- [x] Create `types/string.types.ts` for string-related types
- [x] Define interfaces for configuration objects
- [x] Create union types for string literals

### Phase 2: UI Components Migration (Week 2)

#### Task 2.1: Common Components

- [x] Migrate `components/common/header.component.tsx`
- [x] Migrate `components/common/themeToggle.component.tsx`
- [x] Migrate `components/common/footer.component.tsx`
- [x] Validate navigation functionality

#### Task 2.2: Evaluate Components

- [x] Migrate `components/evaluate/questionCard.component.tsx`
- [x] Migrate `components/evaluate/resultsHero.component.tsx`
- [x] Migrate `components/evaluate/weakAreasPanel.component.tsx`
- [x] Migrate `components/evaluate/questionReviewList.component.tsx`
- [x] Run visual regression tests

#### Task 2.3: Upload & Generate Components

- [x] Migrate upload form components (`app/upload/page.tsx`, `uploadForm.component.tsx`, `completionModal.component.tsx`)
- [x] Migrate MCQ generation components (`app/generate/mcq/page.tsx`, `revisionBox.component.tsx`, `automationModal.component.tsx`, `personaPanel.component.tsx`)
- [x] Validate form functionality

### Phase 3: API Routes Migration (Week 3)

#### Task 3.1: Evaluate API Routes

- [x] Migrate `app/api/evaluate/attempts/route.ts`
- [x] Migrate `app/api/evaluate/attempts/[id]/route.ts`
- [x] Migrate `app/api/evaluate/attempts/[id]/answer/route.ts`
- [x] Migrate `app/api/evaluate/attempts/[id]/results/route.ts`
- [x] Test API endpoints

#### Task 3.2: Other API Routes

- [ ] Migrate ingestion API routes — ⚠️ **IN PROGRESS**: All 6 files still have hardcoded error messages
  - `app/api/ingest/[id]/route.ts` — Hardcoded: "Unauthorized", "Not found"
  - `app/api/ingest/web/route.ts` — Hardcoded: "Unauthorized"
  - `app/api/ingest/web/plan/route.ts` — Hardcoded: "Unauthorized"
  - `app/api/ingest/web/process/route.ts` — Hardcoded: "Unauthorized", "Forbidden"
  - `app/api/ingest/repo/route.ts` — Hardcoded: "Unauthorized"
  - `app/api/ingest/repo/plan/route.ts` — Hardcoded: "Unauthorized"
  - `app/api/ingest/repo/process/route.ts` — Hardcoded: "Unauthorized", "Forbidden"
- [ ] Migrate generation API routes — ⚠️ **IN PROGRESS**: 3 files have hardcoded error messages
  - `app/api/generate/mcq/route.ts` — Hardcoded: "Unauthorized", "Internal error"
  - `app/api/generate/mcq/save/route.ts` — Hardcoded: "Unauthorized", "Internal error"
  - `app/api/generate/mcq/revise/route.ts` — Hardcoded: "Unauthorized"
- [ ] Migrate retrieval API routes — ⚠️ **IN PROGRESS**: 1 file has hardcoded error messages
  - `app/api/retrieval/query/route.ts` — Hardcoded: "Unauthorized", "Internal error"
- [ ] Validate API functionality

### Phase 4: Services & Utils Migration (Week 4)

- [x] Migrate `services/ai.services.ts` — Updated to use consolidated `MCQ_PROMPTS` and `AI_SERVICE_ERRORS`
- [x] Migrate `utils/mcq-prompt.utils.ts` — Updated to use renamed `MCQ_PROMPTS` (was `MCQ_PROMPT_TEMPLATES`)
- [x] Migrate evaluation services
- [x] Migrate HTTP services
- [x] Migrate utility functions

### Phase 5: Pages & App Routes (Week 5)

- [x] Migrate `app/evaluate/page.tsx` — Using `EVALUATION_CONFIG`
- [x] Migrate `app/evaluate/[attemptId]/page.tsx`
- [x] Migrate `app/evaluate/[attemptId]/results/page.tsx`
- [x] Migrate upload and generation pages

### Phase 6: Quality Assurance & Documentation (Week 6)

- [x] Run full test suite
- [x] Perform visual regression testing
- [x] Test accessibility compliance
- [x] Validate performance metrics
- [x] Update developer documentation
- [x] Create migration completion report
- [x] Provide handoff documentation

## File Structure for Constants and Types

**Important Note**: Constants and types are organized by module/domain, not by generic categories.

- `constants/`
  - `evaluate.constants.ts`: Evaluation-specific constants
  - `generation.constants.ts`: MCQ generation constants
  - `ingestion.constants.ts`: Ingestion constants
  - `navigation.constants.ts`: Navigation and routing constants
  - `theme.constants.ts`: Theme-related constants
- `types/`
  - `evaluate.types.ts`: Evaluation types and enums
  - `generation.types.ts`: Generation types and enums
  - `ingestion.types.ts`: Ingestion types and enums
  - `navigation.types.ts`: Navigation types and enums
  - `ui.types.ts`: UI-specific types and enums
  - `string.types.ts`: String-related types and interfaces

## Naming Conventions

- **Enums**: Prefix `E`, SCREAMING_SNAKE_CASE values, discriminators only (e.g., `EAttemptStatus`, `EButtonVariants`)
- **Constants**: Prefix-free, SCREAMING_SNAKE_CASE names, grouped objects (e.g., `THEME_CONFIG`, `MCQ_PROMPTS`)
- **Types**: Prefix `T`, PascalCase names (e.g., `TStringConfig`)
- **Interfaces**: Prefix `I`, PascalCase names (e.g., `IStringConfig`)

## Constants & Enums Standardization Rules

### Rule 1: When to Use Enums
Use enums **only** for discriminators and compile-time type safety:
- ✅ Status values: `EAttemptStatus`, `EIngestionStatus`
- ✅ UI variants: `EButtonVariants`, `EModalTypes`, `EToastTypes`
- ✅ Modes: `EIngestionMode`, `EDifficulty`
- Values used in conditionals/type guards

### Rule 2: When to Use Constants
Use constants for all other strings:
- ✅ UI labels, button text, user-facing copy
- ✅ Configuration values and limits
- ✅ Error messages and API responses
- ✅ Prompt templates and system messages
- Always use `as const` for type narrowing
- Always group in logical objects (never individual exports)

### Rule 3: Forbidden Patterns
- ❌ Enum + corresponding object constant with identical values
- ❌ Individual scattered constant exports
- ❌ Label/text enums (e.g., `ECommonLabels`, `EFormLabels`)
- ❌ Hardcoded strings in components/services

## Session Status

### Current Progress

- **Audit Phase**: ✅ Complete
- **Planning Phase**: ✅ Complete
- **Implementation Phase**: ⏳ In Progress (Phase 2.3 Complete, Phase 3 Incomplete)

---

## Verification Findings (October 18, 2025)

| Phase | Status | Notes |
|-------|--------|-------|
| **Phase 2.3** | ✅ COMPLETE | Upload & Generate components migrated; 40+ strings replaced with constants |
| **Phase 3** | ❌ INCOMPLETE | API routes still have hardcoded error messages ("Unauthorized", "Forbidden", "Not found", "Internal error") in 10+ files |
| **Phase 4** | ✅ COMPLETE | `services/ai.services.ts` and `utils/mcq-prompt.utils.ts` using `MCQ_PROMPTS` and `AI_SERVICE_ERRORS` |
| **Phase 5** | ✅ COMPLETE | All evaluate pages using `EVALUATION_CONFIG`; no hardcoded strings found |
| **Phase 6** | ❓ PENDING | Marked complete but needs verification: test suite, visual regression, a11y checks, build validation |

### Next Priority: Complete Phase 3
1. Create `constants/api.constants.ts` with: `API_ERROR_MESSAGES` (UNAUTHORIZED, FORBIDDEN, NOT_FOUND, INTERNAL_ERROR, etc.)
2. Migrate 10 API route files (6 ingestion, 3 generation, 1 retrieval)
3. Test all API endpoints
