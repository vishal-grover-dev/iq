import fs from "fs";
import path from "path";
import { EInterviewTopic } from "@/types/upload.types";
import { INTERVIEW_SUBTOPICS } from "@/constants/interview-streams.constants";
import { TIngestCatalog } from "@/types/interview-streams.types";

/**
 * Resolve the catalog file path from project root.
 */
function getCatalogPath(): string {
  return path.join(process.cwd(), "data", "interview-ingest-catalog.json");
}

/**
 * Load the interview ingestion catalog from disk.
 * Returns parsed JSON containing topic → catalog items mapping.
 */
export function loadIngestCatalog(): TIngestCatalog {
  const file = fs.readFileSync(getCatalogPath(), "utf-8");
  return JSON.parse(file) as TIngestCatalog;
}

/**
 * Derive subtopics for a given topic from the catalog.
 * Falls back to predefined subtopics from constants if catalog entries are empty.
 */
export function getSubtopicsFromCatalog(topic: EInterviewTopic): readonly string[] {
  const catalog = loadIngestCatalog();
  const items = catalog[topic] ?? [];
  if (items.length > 0) return items.map((i) => i.subtopic);
  return INTERVIEW_SUBTOPICS[topic] ?? [];
}
