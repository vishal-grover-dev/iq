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

## Audit Results

### Categories of Hardcoded Strings Identified

#### 1. UI Labels & Text (High Priority)

- Navigation menu items
- Button text and actions
- Form labels and placeholders
- Error messages and notifications
- Status indicators and progress text

#### 2. API Responses & Error Messages (High Priority)

- HTTP status messages
- Validation error text
- Authentication messages
- Database operation feedback

#### 3. Configuration Values (Medium Priority)

- Feature flags and environment variable names
- Default values and limits
- Model names and API endpoints

#### 4. Business Logic Constants (Medium Priority)

- Difficulty levels and Bloom taxonomy
- Evaluation parameters
- Scoring thresholds and weights

#### 5. Database Schema References (Low Priority)

- Table and column names
- Query parameters
- Migration references

## Detailed Audit Log

### Module: `components/common/`

#### File: `header.component.tsx`

```typescript
// HARDCODED STRINGS FOUND:
- "Upload" (line 55)
- "Generate" (line 62)
- "Evaluate" (line 69)
- Navigation link text

// REFACTOR TO:
// In types/navigation.types.ts:
enum ENavigationLabels {
  UPLOAD = "Upload",
  GENERATE = "Generate",
  EVALUATE = "Evaluate"
}
```

#### File: `themeToggle.component.tsx`

```typescript
// HARDCODED STRINGS FOUND:
- Theme-related labels and accessibility text

// REFACTOR TO:
enum EThemeLabels {
  LIGHT_MODE = "Light mode",
  DARK_MODE = "Dark mode"
}
```

### Module: `components/evaluate/`

#### File: `questionCard.component.tsx`

```typescript
// HARDCODED STRINGS FOUND:
- "Submitting..." (line 155)
- "Submit Answer" (line 155)
- "Explanation" (line 163)
- "Learn More" (line 171)
- "Press 1-4 to select, Enter to submit" (line 153)

// REFACTOR TO:
enum EQuestionCardLabels {
  SUBMITTING = "Submitting...",
  SUBMIT_ANSWER = "Submit Answer",
  EXPLANATION = "Explanation",
  LEARN_MORE = "Learn More",
  KEYBOARD_HINTS = "Press 1-4 to select, Enter to submit"
}
```

#### File: `resultsHero.component.tsx`

```typescript
// HARDCODED STRINGS FOUND:
- Tier messages and descriptions
- "Expert Tier", "Outstanding mastery!" etc.

// REFACTOR TO:
interface IResultTierConfig {
  title: string;
  headline: string;
  description: string;
  accentClass: string;
  badgeClass: string;
}

const RESULT_TIER_CONFIGS: Record<TResultTier, IResultTierConfig> = {
  expert: {
    title: "Expert Tier",
    headline: "Outstanding mastery!",
    description: "You nailed this attempt with interview-ready precision. Keep the momentum going!",
    accentClass: "text-emerald-400",
    badgeClass: "bg-emerald-500/15 text-emerald-300"
  },
  // ... other tiers
};
```

#### File: `weakAreasPanel.component.tsx`

```typescript
// HARDCODED STRINGS FOUND:
- "Needs Focus", "General mastery"
- CSS class strings for styling

// REFACTOR TO:
enum EWeakAreaLabels {
  NEEDS_FOCUS = "Needs Focus",
  GENERAL_MASTERY = "General mastery"
}

const WEAK_AREA_STYLES = {
  critical: {
    badge: "bg-red-600 text-white shadow-sm",
    glow: "from-rose-500/20 via-orange-500/10 to-transparent",
    border: "border-red-500/50"
  },
  // ... other styles
} as const;
```

### Module: `app/evaluate/`

#### File: `page.tsx`

```typescript
// HARDCODED STRINGS FOUND:
- "Frontend Skills Assessment" (line 59)
- "Test your React.js ecosystem knowledge..." (line 61-62)
- "Resume Your Evaluation" (line 70)
- "Continue where you left off" (line 71)
- "Progress" (line 78)
- "questions" (line 79)
- "Resume Evaluation" (line 94)
- "Started" (line 96)
- "Start New Evaluation" (line 107)
- "Creating..." (line 155)
- "Start Evaluation" (line 158)
- "Past Attempts" (line 169)
- "View Results" (line 193)
- "No attempts yet..." (line 205-207)

// REFACTOR TO:
enum EEvaluatePageLabels {
  PAGE_TITLE = "Frontend Skills Assessment",
  PAGE_DESCRIPTION = "Test your React.js ecosystem knowledge with a comprehensive 60-question evaluation",
  RESUME_TITLE = "Resume Your Evaluation",
  RESUME_SUBTITLE = "Continue where you left off",
  PROGRESS_LABEL = "Progress",
  QUESTIONS_LABEL = "questions",
  RESUME_BUTTON = "Resume Evaluation",
  STARTED_LABEL = "Started",
  START_NEW_TITLE = "Start New Evaluation",
  CREATING_BUTTON = "Creating...",
  START_EVALUATION_BUTTON = "Start Evaluation",
  PAST_ATTEMPTS_TITLE = "Past Attempts",
  VIEW_RESULTS_BUTTON = "View Results",
  EMPTY_STATE_MESSAGE = "No attempts yet. Start your first evaluation to assess your frontend skills and identify areas for improvement."
}
```

### Module: `app/api/evaluate/`

#### File: `attempts/route.ts`

```typescript
// HARDCODED STRINGS FOUND:
- "Unauthorized" (lines 17, 67)
- "Failed to create attempt" (line 42)
- "Internal server error" (lines 52, 101)
- "Failed to fetch attempts" (line 93)

// REFACTOR TO:
enum EApiErrorMessages {
  UNAUTHORIZED = "Unauthorized",
  FAILED_TO_CREATE_ATTEMPT = "Failed to create attempt",
  INTERNAL_SERVER_ERROR = "Internal server error",
  FAILED_TO_FETCH_ATTEMPTS = "Failed to fetch attempts"
}
```

#### File: `attempts/[id]/results/route.ts`

```typescript
// HARDCODED STRINGS FOUND:
- "Attempt ID is required" (line 24)
- "Authentication required" (line 33)
- "Attempt not found" (line 46)
- "Attempt not completed yet. Complete all 60 questions first." (line 51)
- "Failed to fetch attempt questions" (line 90)

// REFACTOR TO:
enum EAttemptResultsErrorMessages {
  ATTEMPT_ID_REQUIRED = "Attempt ID is required",
  AUTHENTICATION_REQUIRED = "Authentication required",
  ATTEMPT_NOT_FOUND = "Attempt not found",
  ATTEMPT_NOT_COMPLETED = "Attempt not completed yet. Complete all 60 questions first.",
  FAILED_TO_FETCH_QUESTIONS = "Failed to fetch attempt questions"
}
```

### Module: `services/ai.services.ts`

#### Hardcoded Strings:

```typescript
// HARDCODED STRINGS FOUND:
- "Missing OPENAI_API_KEY" (lines 58, 104, 148)
- "OpenAI embeddings count mismatch for batch" (line 79)
- "OpenAI embeddings failed" (line 87)
- "text-embedding-3-small" (line 76)
- "You are a reranking engine..." (line 107)
- "You are a labeling classifier..." (line 151)

// REFACTOR TO:
enum EOpenAIErrorMessages {
  MISSING_API_KEY = "Missing OPENAI_API_KEY",
  EMBEDDINGS_COUNT_MISMATCH = "OpenAI embeddings count mismatch for batch",
  EMBEDDINGS_FAILED = "OpenAI embeddings failed"
}

enum EOpenAIModels {
  TEXT_EMBEDDING_SMALL = "text-embedding-3-small",
  GPT_4O_MINI = "gpt-4o-mini"
}

const OPENAI_PROMPTS = {
  RERANKER_SYSTEM: "You are a reranking engine. Given a query and a list of passages, return strict JSON { items: [{ index, score }] } where index refers to the passage index and score is higher for more relevant passages. Do not include any other keys.",
  LABELER_SYSTEM: "You are a labeling classifier for documentation."
} as const;
```

### Module: `utils/mcq-prompt.utils.ts`

#### Hardcoded Strings:

````typescript
// HARDCODED STRINGS FOUND:
- "You generate high-quality multiple-choice questions..." (line 20)
- "Rules:" (line 21)
- "Avoid generating MCQs similar to..." (line 78)
- "Context (use for grounding and citations):" (line 91)
- "Task: Generate ONE coding MCQ..." (line 98)

// REFACTOR TO:
const MCQ_PROMPT_TEMPLATES = {
  GENERATOR_SYSTEM_INTRO: "You generate high-quality multiple-choice questions (MCQs) with citations.",
  RULES_HEADER: "Rules:",
  NEGATIVE_EXAMPLES_INTRO: "Avoid generating MCQs similar to the following question gists:",
  CONTEXT_HEADER: "Context (use for grounding and citations):",
  CODING_TASK_INSTRUCTION: "Task: Generate ONE coding MCQ. MUST include a fenced code block (```js``` or ```tsx```) in the dedicated 'code' field (3–50 lines). Do NOT place the code in the question; reference the snippet in prose. Ask about behavior/bugs/fixes."
} as const;
````

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
- [ ] Create `types/ingestion.types.ts` for ingestion-related enums
- [ ] Create `constants/ingestion.constants.ts` for ingestion constants
- [x] Establish naming conventions and module-specific structure

#### Task 1.2: Create Type Definitions

- [ ] Create `types/string.types.ts` for string-related types
- [ ] Define interfaces for configuration objects
- [ ] Create union types for string literals

### Phase 2: UI Components Migration (Week 2)

#### Task 2.1: Common Components

- [x] Migrate `components/common/header.component.tsx`
- [x] Migrate `components/common/themeToggle.component.tsx`
- [x] Migrate `components/common/footer.component.tsx`
- [x] Validate navigation functionality
  - Updated theme toggle to consume singular theme label constants and removed literals via new constants.
  - Added `footer.constants.ts` to centralize footer copy, URLs, and emoji usage.

#### Task 2.2: Evaluate Components

- [x] Migrate `components/evaluate/questionCard.component.tsx`
- [x] Migrate `components/evaluate/resultsHero.component.tsx` — centralized tier messaging, score copy, and stat labels in `types/evaluate.types.ts`
- [x] Migrate `components/evaluate/weakAreasPanel.component.tsx` — moved panel headings, badge labels, and tone copy to enums/constants
- [x] Migrate `components/evaluate/questionReviewList.component.tsx` — replaced filter controls, search placeholder, and status text with typed labels
- [x] Run visual regression tests

#### Task 2.3: Upload & Generate Components

- [ ] Migrate upload form components
- [ ] Migrate MCQ generation components
- [ ] Validate form functionality

### Phase 3: API Routes Migration (Week 3)

#### Task 3.1: Evaluate API Routes

- [ ] Migrate `app/api/evaluate/attempts/route.ts`
- [ ] Migrate `app/api/evaluate/attempts/[id]/route.ts`
- [ ] Migrate `app/api/evaluate/attempts/[id]/answer/route.ts`
- [ ] Migrate `app/api/evaluate/attempts/[id]/results/route.ts`
- [ ] Test API endpoints

#### Task 3.2: Other API Routes

- [ ] Migrate ingestion API routes
- [ ] Migrate generation API routes
- [ ] Migrate retrieval API routes
- [ ] Validate API functionality

### Phase 4: Services & Utils Migration (Week 4)

#### Task 4.1: AI Services

- [ ] Migrate `services/ai.services.ts`
- [ ] Migrate `utils/mcq-prompt.utils.ts`
- [ ] Test AI functionality

#### Task 4.2: Other Services

- [ ] Migrate evaluation services
- [ ] Migrate HTTP services
- [ ] Migrate utility functions
- [ ] Validate service functionality

### Phase 5: Pages & App Routes (Week 5)

#### Task 5.1: Evaluate Pages

- [x] Migrate `app/evaluate/page.tsx`
- [ ] Migrate `app/evaluate/[attemptId]/page.tsx`
- [ ] Migrate `app/evaluate/[attemptId]/results/page.tsx`
- [x] Test page functionality

#### Task 5.2: Other Pages

- [ ] Migrate upload pages
- [ ] Migrate generation pages
- [ ] Validate page functionality

### Phase 6: Quality Assurance & Documentation (Week 6)

#### Task 6.1: Testing & Validation

- [ ] Run full test suite
- [ ] Perform visual regression testing
- [ ] Test accessibility compliance
- [ ] Validate performance metrics

#### Task 6.2: Documentation & Handoff

- [ ] Update developer documentation
- [ ] Create migration completion report
- [ ] Document new patterns and conventions
- [ ] Provide handoff documentation
- [ ] Add session handoff notes for future contributors

## File Structure for Constants and Types

**Important Note**: Constants and types should be organized by module/domain, not by generic categories like "ui" or "api". This ensures better maintainability and follows the project's domain-driven structure.

```
constants/
├── evaluate.constants.ts     # Evaluation-specific constants
├── generation.constants.ts   # MCQ generation constants
├── ingestion.constants.ts    # Ingestion constants
├── navigation.constants.ts   # Navigation and routing constants
└── theme.constants.ts        # Theme-related constants

types/
├── evaluate.types.ts         # Evaluation types and enums (existing)
├── generation.types.ts       # Generation types and enums
├── ingestion.types.ts        # Ingestion types and enums
├── navigation.types.ts       # Navigation types and enums
├── ui.types.ts              # UI-specific types and enums
└── string.types.ts          # String-related types and interfaces
```

## Naming Conventions

### Enums

- Prefix: `E` (e.g., `EUILabels`, `EApiErrors`)
- Use SCREAMING_SNAKE_CASE for values
- Group by domain/feature

### Constants

- Prefix: `C` for simple constants (e.g., `CDefaultValues`)
- Use SCREAMING_SNAKE_CASE for names
- Group related constants in objects

### Types

- Prefix: `T` for types (e.g., `TStringConfig`)
- Use PascalCase for names
- Define interfaces for complex objects

### Interfaces

- Prefix: `I` for interfaces (e.g., `IStringConfig`)
- Use PascalCase for names
- Define for configuration objects

## Migration Checklist Template

For each file migration:

- [ ] **Pre-migration**

  - [ ] Create backup of original file
  - [ ] Identify all hardcoded strings
  - [ ] Plan constant/enum structure
  - [ ] Write migration plan

- [ ] **Migration**

  - [ ] Create constants/enums in appropriate files
  - [ ] Replace hardcoded strings with references
  - [ ] Update imports
  - [ ] Maintain type safety

- [ ] **Post-migration**
  - [ ] Run TypeScript compiler
  - [ ] Run ESLint
  - [ ] Test functionality
  - [ ] Update documentation
  - [ ] Mark task complete

## Risk Assessment

### High Risk

- **API Response Changes**: Ensure error message changes don't break client expectations
- **UI Text Changes**: Verify all text displays correctly across different screen sizes
- **Database References**: Confirm table/column name changes don't break queries

### Medium Risk

- **Type Safety**: Ensure new enums/types don't introduce compilation errors
- **Import Dependencies**: Verify all imports resolve correctly
- **Performance**: Monitor for any performance impact from string constant lookups

### Low Risk

- **Configuration Values**: Most config changes are internal and won't affect users
- **Business Logic Constants**: Well-contained and tested

## Success Criteria

1. **Zero Runtime Errors**: All functionality works identically to before
2. **Improved Maintainability**: Strings are centralized and easily modifiable
3. **Type Safety**: Compile-time checking for string values
4. **Consistent Patterns**: Established conventions for future development
5. **Documentation**: Clear guidelines for contributors

## Future Recommendations

1. **Automated Detection**: Set up ESLint rules to detect hardcoded strings
2. **Internationalization**: Plan for i18n support using the new string constants
3. **Testing**: Add tests to verify string constants are used correctly
4. **Monitoring**: Track usage patterns to identify additional refactoring opportunities

## Session Handoff Notes

### Current Status

- **Audit Phase**: ✅ Complete
- **Planning Phase**: ✅ Complete
- **Implementation Phase**: ⏳ In Progress

### Progress Summary (Session 1)

#### ✅ Completed Tasks:

1. **Core Infrastructure**: Created module-specific constants and types files

   - `types/navigation.types.ts` - Navigation enums and types
   - `constants/navigation.constants.ts` - Navigation constants
   - `types/ui.types.ts` - UI-specific enums and types
   - `constants/theme.constants.ts` - Theme constants
   - `types/generation.types.ts` - Generation and AI-related enums
   - `constants/generation.constants.ts` - Generation constants
   - `constants/evaluate.constants.ts` - Evaluation constants

2. **Component Migrations**: Successfully migrated key components

   - `components/common/header.component.tsx` - All navigation strings replaced
   - `app/evaluate/page.tsx` - All UI text replaced with constants
   - `components/evaluate/questionCard.component.tsx` - All labels replaced

3. **Quality Assurance**: All migrated files pass linting with zero errors

#### 📊 Migration Statistics:

- **Files Created**: 7 new constants/types files
- **Files Migrated**: 3 components/pages
- **Hardcoded Strings Replaced**: ~25+ strings
- **Linting Errors**: 0
- **Type Safety**: Maintained throughout

#### 🎯 Next Session Priorities:

1. Complete remaining evaluate components (resultsHero, weakAreasPanel)
2. Migrate API routes with error message constants
3. Migrate services and utilities
4. Complete remaining pages and components

### Next Steps for New Session

1. Review this document for context
2. Begin with Phase 1: Core Infrastructure
3. Follow the detailed task checklist for each module
4. Update progress in this document
5. Run quality assurance after each phase

#### Session 2 (October 16, 2025)

- Completed migration of `components/common/themeToggle.component.tsx` using expanded theme constants.
- Centralized footer strings in new `constants/footer.constants.ts` and updated `components/common/footer.component.tsx` to consume them.
- Next focus: Phase 2.2 evaluate components (`resultsHero`, `weakAreasPanel`, `questionReviewList`).

### Key Files to Monitor

- `constants/` directory (new files)
- `types/string.types.ts` (new file)
- Modified component and service files
- Test results and linting output

### Critical Dependencies

- TypeScript compilation must pass
- ESLint rules must be satisfied
- Visual regression tests must pass
- API functionality must be preserved

---

**Document Version**: 1.0  
**Last Updated**: January 2025  
**Next Review**: After Phase 1 completion
