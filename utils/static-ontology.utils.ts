import * as fs from "fs";
import * as path from "path";

type TStaticSubtopic = {
  name: string;
  chunk_count: number;
};

type TStaticTopic = {
  weight: number;
  chunk_count: number;
  subtopics: TStaticSubtopic[];
};

interface IStaticOntology {
  topics: Record<string, TStaticTopic>;
}

let cachedOntology: IStaticOntology | null = null;

function loadOntology(): IStaticOntology {
  if (cachedOntology) return cachedOntology;
  const filePath = path.join(process.cwd(), "data", "static-ontology.json");
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    cachedOntology = JSON.parse(raw) as IStaticOntology;
  } catch (err) {
    console.error("🚀 ~ loadOntology ~ err:", err);
    cachedOntology = { topics: {} };
  }
  return cachedOntology;
}

export function getStaticTopicList(): string[] {
  return Object.keys(loadOntology().topics);
}

export function getStaticSubtopicsForTopic(topic: string): string[] {
  return (loadOntology().topics[topic]?.subtopics ?? []).map((item) => item.name);
}

export function getStaticTopicWeights(): Record<string, number> {
  const ontology = loadOntology();
  const weights: Record<string, number> = {};
  for (const [topic, meta] of Object.entries(ontology.topics)) {
    weights[topic] = meta.weight;
  }
  return weights;
}

export function getStaticTopicChunkCounts(): Record<string, number> {
  const ontology = loadOntology();
  const counts: Record<string, number> = {};
  for (const [topic, meta] of Object.entries(ontology.topics)) {
    counts[topic] = meta.chunk_count;
  }
  return counts;
}

export function getStaticSubtopicMap(): Record<string, string[]> {
  const ontology = loadOntology();
  const map: Record<string, string[]> = {};
  for (const [topic, meta] of Object.entries(ontology.topics)) {
    map[topic] = meta.subtopics.map((item) => item.name);
  }
  return map;
}

export function getStaticSubtopicDetails(topic: string): TStaticSubtopic[] {
  return loadOntology().topics[topic]?.subtopics ?? [];
}
