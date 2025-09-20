export enum EBloomLevel {
  REMEMBER = "Remember",
  UNDERSTAND = "Understand",
  APPLY = "Apply",
  ANALYZE = "Analyze",
  EVALUATE = "Evaluate",
  CREATE = "Create",
}

export enum EDifficulty {
  EASY = "Easy",
  MEDIUM = "Medium",
  HARD = "Hard",
}

export type TCitation = {
  title?: string;
  url: string;
};

export interface IMcqItemView {
  topic: string;
  subtopic: string;
  version?: string | null;
  difficulty: EDifficulty;
  bloomLevel: EBloomLevel;
  question: string;
  code?: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanation?: string;
  explanationBullets?: string[];
  citations: TCitation[];
}

export enum EPromptMode {
  FEW_SHOT = "few_shot",
  CHAIN_OF_THOUGHT = "chain_of_thought",
}

export type TGeneratorBuildArgs = {
  topic: string;
  subtopic?: string | null;
  version?: string | null;
  difficulty?: EDifficulty;
  bloomLevel?: EBloomLevel;
  contextItems: Array<{ title?: string | null; url: string; content: string }>;
  mode?: EPromptMode;
  examplesCount?: number;
  codingMode?: boolean;
};

export type TJudgeBuildArgs = {
  mcq: IMcqItemView;
  contextItems: Array<{ title?: string | null; url: string; content: string }>;
  codingMode?: boolean;
};

export type TNeighborMcq = {
  question: string;
  options: [string, string, string, string];
};

export type TReviserBuildArgs = {
  currentMcq: IMcqItemView;
  instruction: string;
  contextItems: Array<{ title?: string | null; url: string; content: string }>;
};
