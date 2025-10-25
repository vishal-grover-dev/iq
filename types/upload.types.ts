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
  PWA = "PWA",
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
  subtopic?: string;
  ingestType: EInterviewIngestType;
  url: string;
  depth?: 0 | 1 | 2 | 3 | 4;
}

export interface IInterviewStreamsFormValues {
  contentCategory: EContentCategory.INTERVIEW_STREAMS;
  stream: EInterviewStream;
  items: IInterviewIngestItem[];
}

/**
 * Interview Planning Types
 */
export type TPlanData = {
  total: number;
  batchSize: number;
  slices: Array<{ name: string; start: number; end: number; count: number }>;
  categories: Record<string, number>;
};

export type TWebPlanData = {
  count: number;
  pages: Array<{ url: string; title?: string }>;
  groups?: Array<{ label: string; count: number; pages: Array<{ url: string; title?: string }> }>;
};
