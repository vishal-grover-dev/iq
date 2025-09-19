export enum EContentCategory {
  INTERVIEW_STREAMS = "Interview Streams",
}

export type TUploadState = "idle" | "submitting" | "processing" | "completed" | "failed";

export enum EInterviewStream {
  FRONTEND_REACT = "Front-end with React",
}

export enum EInterviewTopic {
  REACT = "React",
  JAVASCRIPT = "JavaScript",
  TYPESCRIPT = "TypeScript",
  HTML = "HTML",
  CSS = "CSS",
  STATE_MANAGEMENT = "State Management",
  ROUTING = "Routing",
  TESTING = "Testing",
  PERFORMANCE = "Performance & Web Vitals",
  ACCESSIBILITY = "Accessibility",
}

export enum EInterviewIngestType {
  REPO = "Docs Repo (GitHub)",
  WEB = "Website (Crawl)",
}

export interface IInterviewIngestItem {
  topic: EInterviewTopic;
  subtopic: string;
  ingestType: EInterviewIngestType;
  url: string;
}

export interface IInterviewStreamsFormValues {
  contentCategory: EContentCategory.INTERVIEW_STREAMS;
  stream: EInterviewStream;
  items: IInterviewIngestItem[];
}

// Interview Streams predefined subtopic unions (v1 scope)
// Keep these in sync with INTERVIEW_SUBTOPICS in utils/interview-streams-options.utils.ts
export type TReactSubtopicPredefined =
  | "Components & Props"
  | "JSX & Rendering"
  | "State & Lifecycle"
  | "Events & Forms (Controlled)"
  | "Lists & Keys (Reconciliation)"
  | "Context API"
  | "Hooks: useState"
  | "Hooks: useEffect"
  | "Hooks: useMemo"
  | "Hooks: useCallback"
  | "Hooks: useRef"
  | "Hooks: useContext"
  | "Hooks: useReducer"
  | "Custom Hooks"
  | "Performance Optimization"
  | "Memoization (React.memo/useMemo/useCallback)"
  | "Error Boundaries"
  | "Portals"
  | "Concurrent Rendering (Basics)"
  | "Suspense (Intro)";

export type TJavaScriptSubtopicPredefined =
  | "Types & Coercion"
  | "let/const/var & Scope"
  | "Scope & Closures"
  | "this, call/apply/bind"
  | "Objects & Prototypes"
  | "Prototypal Inheritance"
  | "Classes"
  | "Arrays & Iteration"
  | "Functions & Higher-Order Functions"
  | "Promises"
  | "Async/Await"
  | "Event Loop & Task/Microtask Queue"
  | "Modules (ESM/CommonJS)"
  | "Iterators & Generators"
  | "Collections (Map/Set/WeakMap/WeakSet)"
  | "Error Handling (try/catch)";
