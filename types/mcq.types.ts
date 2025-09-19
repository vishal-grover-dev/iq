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
  options: [string, string, string, string];
  correctIndex: number;
  citations: TCitation[];
}
