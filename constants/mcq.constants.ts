import { EMvpTopicPriority, TMvpTopicConfig } from "@/types/generation.types";

export const MVP_TOPICS = {
  React: {
    weight: 0.4,
    priority: EMvpTopicPriority.HIGH,
    subtopics: [
      "Components & Props",
      "JSX & Rendering",
      "Hooks: useState",
      "Hooks: useEffect",
      "Hooks: useMemo & useCallback",
      "Hooks: useRef",
      "Hooks: useReducer",
      "Custom Hooks",
      "State & Lifecycle",
      "Context API",
      "Events & Forms (Controlled)",
      "Controlled vs Uncontrolled Forms",
      "Lists & Keys (Reconciliation)",
      "Diffing Algorithm (React Fiber)",
      "Performance Optimization",
      "Memoization",
      "Error Boundaries",
      "Refs & DOM Manipulation",
      "Fragments",
      "Strict Mode",
      "Data Fetching Patterns",
      "Rendering Strategies (CSR vs SSR/SSG/ISR)",
      "Virtual DOM Trees",
    ],
  },
  JavaScript: {
    weight: 0.3,
    priority: EMvpTopicPriority.HIGH,
    subtopics: [
      "let/const/var & Scope",
      "Functions & Higher-Order Functions",
      "Objects & Prototypes",
      "Closures & Lexical Scope",
      "this, call/apply/bind",
      "Types & Coercion",
      "Control Flow",
      "Error Handling",
      "Async/Await & Promises",
      "Collections (Map/Set)",
      "Array Prototype Methods",
      "Prototypal Inheritance",
      "Classes (ES6)",
      "Web Workers & Service Workers",
    ],
  },
  HTML: {
    weight: 0.05,
    priority: EMvpTopicPriority.MEDIUM,
    subtopics: [
      "Document Structure & Semantics",
      "Forms & Validation Basics",
      "Media Elements",
      "Accessibility Fundamentals",
      "Metadata & SEO Essentials",
      "Tables & Tabular Data",
      "Links & Navigation Elements",
      "Headings & Content Organization",
      "HTML5 APIs Overview",
      "Service Workers & Offline Readiness",
    ],
  },
  CSS: {
    weight: 0.05,
    priority: EMvpTopicPriority.MEDIUM,
    subtopics: [
      "Layout Foundations",
      "Flexbox Fundamentals",
      "Grid Layout Basics",
      "Responsive Design Techniques",
      "Cascade & Specificity Management",
      "Custom Properties",
      "Theming & Design Systems (Light/Dark Modes)",
    ],
  },
  "State Management": {
    weight: 0.05,
    priority: EMvpTopicPriority.MEDIUM,
    subtopics: [
      "React Context API",
      "Local vs Global State",
      "State Lifting Patterns",
      "Redux Toolkit Basics",
      "Selectors & Memoization",
      "Immutability Concepts",
    ],
  },
  TypeScript: {
    weight: 0.05,
    priority: EMvpTopicPriority.MEDIUM,
    subtopics: [
      "Basic & Literal Types",
      "React Component Props Typing",
      "JSX & React Types",
      "Generic Components",
      "Type Narrowing",
    ],
  },
  Accessibility: {
    weight: 0.05,
    priority: EMvpTopicPriority.MEDIUM,
    subtopics: [
      "Accessibility Basics & Inclusive Design",
      "Semantic HTML & Landmarks",
      "ARIA Roles & Attributes",
      "Focus Management & Keyboard Navigation",
      "Color Contrast & Theming",
      "Accessible Forms & Messaging",
    ],
  },
  Testing: {
    weight: 0.05,
    priority: EMvpTopicPriority.MEDIUM,
    subtopics: [
      "React Testing Library Basics",
      "Component Rendering & Queries",
      "User Interaction Testing",
      "Async Testing Patterns",
      "Mocking Fundamentals",
      "Testing Mindset",
    ],
  },
} as const satisfies Record<string, TMvpTopicConfig>;

export type TMvpTopic = keyof typeof MVP_TOPICS;

export type TMvpSubtopic<TTopic extends TMvpTopic = TMvpTopic> = (typeof MVP_TOPICS)[TTopic]["subtopics"][number];

export const MVP_TOPIC_LIST = Object.keys(MVP_TOPICS) as TMvpTopic[];

export function getMvpSubtopics<TTopic extends TMvpTopic>(topic: TTopic): readonly TMvpSubtopic<TTopic>[] {
  return MVP_TOPICS[topic].subtopics;
}

export function getMvpTopicWeight(topic: TMvpTopic): number {
  return MVP_TOPICS[topic].weight;
}

export function getMvpTopicPriority(topic: TMvpTopic): EMvpTopicPriority {
  return MVP_TOPICS[topic].priority;
}

export function assertSubtopic(topic: TMvpTopic, value: string): TMvpSubtopic {
  const subtopics = MVP_TOPICS[topic].subtopics as readonly TMvpSubtopic[];
  if (!subtopics.includes(value as TMvpSubtopic)) {
    throw new Error(`[mcq.constants] Unknown subtopic "${value}" for topic "${topic}".`);
  }
  return value as TMvpSubtopic;
}

export const TOPICS = {
  REACT: "React",
  JAVASCRIPT: "JavaScript",
  HTML: "HTML",
  CSS: "CSS",
  STATE_MANAGEMENT: "State Management",
  TYPESCRIPT: "TypeScript",
  ACCESSIBILITY: "Accessibility",
  TESTING: "Testing",
} as const satisfies Record<string, TMvpTopic>;

export const SUBTOPICS = {
  React: {
    HooksUseRef: assertSubtopic(TOPICS.REACT, "Hooks: useRef"),
    HooksUseEffect: assertSubtopic(TOPICS.REACT, "Hooks: useEffect"),
    ListsKeysReconciliation: assertSubtopic(TOPICS.REACT, "Lists & Keys (Reconciliation)"),
    ComponentsProps: assertSubtopic(TOPICS.REACT, "Components & Props"),
    HooksUseState: assertSubtopic(TOPICS.REACT, "Hooks: useState"),
    HooksUseMemoUseCallback: assertSubtopic(TOPICS.REACT, "Hooks: useMemo & useCallback"),
    CustomHooks: assertSubtopic(TOPICS.REACT, "Custom Hooks"),
    PerformanceOptimization: assertSubtopic(TOPICS.REACT, "Performance Optimization"),
    ContextApi: assertSubtopic(TOPICS.REACT, "Context API"),
    ErrorBoundaries: assertSubtopic(TOPICS.REACT, "Error Boundaries"),
  },
  JavaScript: {
    ArrayPrototypeMethods: assertSubtopic(TOPICS.JAVASCRIPT, "Array Prototype Methods"),
    AsyncAwaitPromises: assertSubtopic(TOPICS.JAVASCRIPT, "Async/Await & Promises"),
    ClosuresLexicalScope: assertSubtopic(TOPICS.JAVASCRIPT, "Closures & Lexical Scope"),
  },
  TypeScript: {
    TypeNarrowing: assertSubtopic(TOPICS.TYPESCRIPT, "Type Narrowing"),
    ReactComponentPropsTyping: assertSubtopic(TOPICS.TYPESCRIPT, "React Component Props Typing"),
    GenericComponents: assertSubtopic(TOPICS.TYPESCRIPT, "Generic Components"),
  },
  HTML: {
    DocumentStructureSemantics: assertSubtopic(TOPICS.HTML, "Document Structure & Semantics"),
    FormsValidationBasics: assertSubtopic(TOPICS.HTML, "Forms & Validation Basics"),
    AccessibilityFundamentals: assertSubtopic(TOPICS.HTML, "Accessibility Fundamentals"),
  },
  CSS: {
    FlexboxFundamentals: assertSubtopic(TOPICS.CSS, "Flexbox Fundamentals"),
    GridLayoutBasics: assertSubtopic(TOPICS.CSS, "Grid Layout Basics"),
    ResponsiveDesignTechniques: assertSubtopic(TOPICS.CSS, "Responsive Design Techniques"),
  },
  StateManagement: {
    ReactContextApi: assertSubtopic(TOPICS.STATE_MANAGEMENT, "React Context API"),
    StateLiftingPatterns: assertSubtopic(TOPICS.STATE_MANAGEMENT, "State Lifting Patterns"),
    ReduxToolkitBasics: assertSubtopic(TOPICS.STATE_MANAGEMENT, "Redux Toolkit Basics"),
  },
  Accessibility: {
    FocusManagementKeyboardNavigation: assertSubtopic(
      TOPICS.ACCESSIBILITY,
      "Focus Management & Keyboard Navigation"
    ),
    AriaRolesAttributes: assertSubtopic(TOPICS.ACCESSIBILITY, "ARIA Roles & Attributes"),
    ColorContrastTheming: assertSubtopic(TOPICS.ACCESSIBILITY, "Color Contrast & Theming"),
  },
  Testing: {
    AsyncTestingPatterns: assertSubtopic(TOPICS.TESTING, "Async Testing Patterns"),
    ComponentRenderingQueries: assertSubtopic(TOPICS.TESTING, "Component Rendering & Queries"),
    MockingFundamentals: assertSubtopic(TOPICS.TESTING, "Mocking Fundamentals"),
  },
} as const satisfies Record<string, Record<string, TMvpSubtopic>>;

export type TTopicKey = keyof typeof TOPICS;

