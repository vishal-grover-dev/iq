import { EInterviewIngestType, EInterviewStream, EInterviewTopic } from "@/types/upload.types";

export const INTERVIEW_DEFAULT_STREAM: EInterviewStream = EInterviewStream.FRONTEND_REACT;

export const INTERVIEW_TOPIC_OPTIONS = [
  { label: EInterviewTopic.REACT, value: EInterviewTopic.REACT },
  { label: EInterviewTopic.JAVASCRIPT, value: EInterviewTopic.JAVASCRIPT },
] as const;

// Predefined subtopics per topic; UI will also allow "Other" which opens a modal
export const INTERVIEW_SUBTOPICS: Record<EInterviewTopic, readonly string[]> = {
  [EInterviewTopic.REACT]: [
    "Components & Props",
    "State & Lifecycle",
    "Hooks (useState/useEffect)",
    "Hooks (useMemo/useCallback)",
    "Context",
    "Reconciliation & Keys",
    "Performance",
  ],
  [EInterviewTopic.JAVASCRIPT]: [
    "Closures",
    "Promises & Async/Await",
    "Prototypes & Inheritance",
    "Modules",
    "Event Loop",
    "Types & Coercion",
  ],
};

export const INTERVIEW_INGEST_TYPE_OPTIONS = [
  { label: EInterviewIngestType.REPO, value: EInterviewIngestType.REPO },
  { label: EInterviewIngestType.WEB, value: EInterviewIngestType.WEB },
] as const;
