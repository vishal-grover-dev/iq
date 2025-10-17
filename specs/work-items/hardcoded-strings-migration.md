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
- Hardcoded strings: "Upload", "Generate", "Evaluate", and related navigation link text.
- Refactor plan: define an enum named ENavigationLabels in `types/navigation.types.ts` to centralize these labels.

#### File: `themeToggle.component.tsx`
- Hardcoded strings: all theme toggle labels and accessibility text.
- Refactor plan: introduce an enum named EThemeLabels capturing "Light mode" and "Dark mode" values.

### Module: `components/evaluate/`

#### File: `questionCard.component.tsx`
- Hardcoded strings: "Submitting...", "Submit Answer", "Explanation", "Learn More", and "Press 1-4 to select, Enter to submit".
- Refactor plan: add an enum named EQuestionCardLabels encapsulating these values for reuse across the component.

#### File: `resultsHero.component.tsx`
- Hardcoded strings: tier titles, headlines, descriptions, and tier-specific style class strings.
- Refactor plan: create an interface named IResultTierConfig and a `RESULT_TIER_CONFIGS` record keyed by `TResultTier` to store copy and style classes.

#### File: `weakAreasPanel.component.tsx`
- Hardcoded strings: tone labels such as "Needs Focus" and "General mastery" plus badge/glow/border class strings.
- Refactor plan: define an enum named EWeakAreaLabels for tone copy and a `WEAK_AREA_STYLES` constant object for style tokens.

### Module: `app/evaluate/`

#### File: `page.tsx`
- Hardcoded strings: all landing page headings, subheadings, button labels, progress labels, and empty-state copy including "Frontend Skills Assessment", "Resume Your Evaluation", "Start New Evaluation", and related text.
- Refactor plan: add an enum named EEvaluatePageLabels to house page text plus an empty-state message constant for consistent reuse.

### Module: `app/api/evaluate/`

#### File: `attempts/route.ts`
- Hardcoded strings: common error responses including "Unauthorized", "Failed to create attempt", "Internal server error", and "Failed to fetch attempts".
- Refactor plan: define an enum named EApiErrorMessages capturing these shared error messages for reuse across evaluate API handlers.

#### File: `attempts/[id]/results/route.ts`
- Hardcoded strings: validation and data-fetch errors such as "Attempt ID is required", "Authentication required", "Attempt not found", and completion gate messaging.
- Refactor plan: create an enum named EAttemptResultsErrorMessages to consolidate these responses for consistent usage.

### Module: `services/ai.services.ts`

#### Hardcoded Strings:
- Hardcoded strings: missing API key and embeddings error messages, model names like "text-embedding-3-small", plus system prompts for reranker and labeler flows.
- Refactor plan: introduce enums for OpenAI error messages and model identifiers, along with a typed `OPENAI_PROMPTS` constant object for system messages.

### Module: `utils/mcq-prompt.utils.ts`

#### Hardcoded Strings:
- Hardcoded strings: generator system prompt intro, rules header, negative example intro, context header, and coding task instructions containing code fence guidance.
- Refactor plan: add a `MCQ_PROMPT_TEMPLATES` constant object with const assertion to centralize these prompt fragments for reuse across utilities.

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
- [x] Create `types/ingestion.types.ts` for ingestion-related enums // Added canonical enums and shared interfaces for ingestion metadata/progress
- [x] Create `constants/ingestion.constants.ts` for ingestion constants // Centralized defaults, labels, and toast copy for ingestion flows
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

- `constants/`
  - `evaluate.constants.ts`: Evaluation-specific constants
  - `generation.constants.ts`: MCQ generation constants
  - `ingestion.constants.ts`: Ingestion constants
  - `navigation.constants.ts`: Navigation and routing constants
  - `theme.constants.ts`: Theme-related constants
- `types/`
  - `evaluate.types.ts`: Evaluation types and enums (existing)
  - `generation.types.ts`: Generation types and enums
  - `ingestion.types.ts`: Ingestion types and enums
  - `navigation.types.ts`: Navigation types and enums
  - `ui.types.ts`: UI-specific types and enums
  - `string.types.ts`: String-related types and interfaces

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
