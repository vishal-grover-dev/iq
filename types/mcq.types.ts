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

export enum EQuestionStyle {
  THEORY = "theory",
  CODE_READING = "code-reading",
  DEBUG = "debug",
  REFACTOR = "refactor",
  TRADEOFF = "tradeoff",
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
  questionStyle?: EQuestionStyle;
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
  /**
   * Optional list of brief question gists to avoid generating similar items to.
   * Used to reduce duplicates by providing negative examples to the LLM.
   */
  negativeExamples?: string[];
  /**
   * Optional list of available subtopics for the chosen topic from the dynamic ontology.
   * Helps the generator align subtopic selection with actual embedded content.
   */
  availableSubtopics?: string[];
  /**
   * Soft avoid list of topics for generation. The model should steer away
   * from these topics if sufficient candidates exist, and may relax otherwise.
   */
  avoidTopics?: string[];
  /**
   * Soft avoid list of subtopics (e.g., recent/dominant) to reduce clustering.
   * The model should avoid these when possible, and may relax on retries.
   */
  avoidSubtopics?: string[];
  /**
   * Optional question style hint used when question style experiments are enabled.
   */
  questionStyle?: EQuestionStyle;
  /**
   * Additional builder instructions appended to the prompt when experimenting with new guidance.
   */
  extraInstructions?: string | null;
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
