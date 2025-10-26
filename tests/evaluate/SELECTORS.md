# Evaluate Feature Selectors

## Landing Page (`/evaluate`)

### First-Time User (No Attempts)
- Empty state message: `text=/You haven't started any evaluations yet/` (from EVALUATE_PAGE_LABELS.EMPTY_STATE_MESSAGE)
- Onboarding step 1: Look for numbered circles with class `bg-primary text-primary-foreground flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold`
- Onboarding step 2: Same pattern as step 1
- Onboarding step 3: Same pattern as step 1
- Start button: `button` with text matching EVALUATE_PAGE_LABELS.START_EVALUATION_BUTTON

### Resume In-Progress Attempt
- Resume section: `div` with classes `bg-primary/5 border-primary/20 mb-8 rounded-lg border p-6` (NO data-testid - NEEDS TO BE ADDED)
- Progress text: Extract from text content "X / 60 questions" (from line 79-80)
- Progress bar: `div` with classes `bg-secondary h-2 w-full overflow-hidden rounded-full` (NO data-testid - NEEDS TO BE ADDED)
- Started date: Text content after EVALUATE_PAGE_LABELS.STARTED_LABEL
- Resume button: `button` with text matching EVALUATE_PAGE_LABELS.RESUME_BUTTON

### Past Attempts List
- Past attempts container: `div` with classes `rounded-lg border p-6` (NO data-testid - NEEDS TO BE ADDED)
- Individual attempt: `div` with classes `hover:bg-muted/50 flex items-center justify-between rounded-lg border p-4 transition-colors` (NO data-testid - NEEDS TO BE ADDED)
- Attempt score: Extract from text "X%" (from line 175)
- Attempt date: Extract from text "Completed [date]" (from line 182)
- View results button: `button` with text matching EVALUATE_PAGE_LABELS.VIEW_RESULTS_BUTTON

## In-Progress Attempt Page (`/evaluate/[attemptId]`)

### Progress Indicator
- Current selector: `[data-testid='progress-indicator']` (line 200)
- Format: "Question X / 60"
- Percentage display: "X% complete" (line 219, 247)

### Question Card
- Card container: `[data-testid='question-card']` (from questionCard.component.tsx line 113)
- Question text: `[data-testid='question-text'] p` (ReactMarkdown renders <p> tags)
- Metadata: `[data-testid='question-metadata']` (line 116)
- Code block: Look for Prism syntax highlighting

### Options & Submission
- Option buttons: `[data-testid='option-button']` (from optionButton.component.tsx line 88)
- Submit button: `button` with text matching /submit.*answer/i
- Button states: Check for `disabled` attribute

### Pause Button
- Pause button: `button` with text "Pause & Save" (line 229)

## Results Page (`/evaluate/[attemptId]/results`)

### Score Display
- Score gauge: Component `ScoreGauge` (from resultsHero.component.tsx line 152) - NO data-testid (NEEDS TO BE ADDED)
- Score percentage: Extract from ResultsHero component - NO data-testid (NEEDS TO BE ADDED)
- Correct count: Extract from ResultsHero component - NO data-testid (NEEDS TO BE ADDED)

### Breakdowns
- Topic breakdown: `PerformanceBarChart` component with title "Performance by Topic" (line 156) - NO data-testid (NEEDS TO BE ADDED)
- Bloom breakdown: `PerformanceBarChart` component with title "Performance by Cognitive Level" (line 157) - NO data-testid (NEEDS TO BE ADDED)
- Difficulty breakdown: `PerformanceBarChart` component with title "Performance by Difficulty" (line 163) - NO data-testid (NEEDS TO BE ADDED)

### Weak Areas
- Weak areas panel: `WeakAreasPanel` component (line 190) - NO data-testid (NEEDS TO BE ADDED)
- Individual weak area: Cards within WeakAreasPanel - NO data-testid (NEEDS TO BE ADDED)
- Recommendation text: Extract from content
- Citation links: `a` tags within weak area

### Review Section
- Review list: `QuestionReviewList` component (line 217) - NO data-testid (NEEDS TO BE ADDED)
- Review question: Individual questions within QuestionReviewList - NO data-testid (NEEDS TO BE ADDED)
- Filter controls: `ReviewFilterBar` component - NO data-testid (NEEDS TO BE ADDED)

## Missing data-testid Attributes to Add

Based on component analysis, the following data-testid attributes need to be added:

### Landing Page (`app/evaluate/page.tsx`)
1. Resume section: `data-testid='resume-section'`
2. Progress text: `data-testid='resume-progress'`
3. Progress bar: `data-testid='resume-progress-bar'`
4. Started date: `data-testid='resume-started-date'`
5. Past attempts container: `data-testid='past-attempts'`
6. Individual attempt: `data-testid='past-attempt'`
7. Attempt score: `data-testid='attempt-score'`
8. Attempt date: `data-testid='attempt-date'`

### Results Page Components
1. Score gauge: `data-testid='score-gauge'`
2. Score percentage: `data-testid='score-percentage'`
3. Correct count: `data-testid='correct-count'`
4. Topic breakdown: `data-testid='topic-breakdown'`
5. Bloom breakdown: `data-testid='bloom-breakdown'`
6. Difficulty breakdown: `data-testid='difficulty-breakdown'`
7. Weak areas panel: `data-testid='weak-areas-panel'`
8. Individual weak area: `data-testid='weak-area'`
9. Review list: `data-testid='review-list'`
10. Review question: `data-testid='review-question'`
11. Filter controls: `data-testid='review-filters'`

## Current Working Selectors (No Changes Needed)

These selectors are already working correctly:
- `[data-testid='question-card']` - Question card container
- `[data-testid='question-text']` - Question text container (use `p` child for actual text)
- `[data-testid='question-metadata']` - Question metadata chips
- `[data-testid='option-button']` - Option buttons
- `[data-testid='progress-indicator']` - Progress indicator
- Submit button: `button` with text matching /submit.*answer/i
- Resume button: `button` with text matching /resume.*evaluation/i
- Start button: `button` with text matching /start.*evaluation/i
