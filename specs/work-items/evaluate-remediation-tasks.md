# Evaluate Feature: Remediation Tasks (Dynamic Ontology + Selection Robustness)

> **Status**: Ready for implementation
> **Created**: 2025-10-03
> **Related**: evaluate-page.md Postmortem section

## Overview

This document provides comprehensive implementation details for two critical improvements to the evaluate feature:

1. **Phase 0**: Dynamic Ontology Infrastructure - Align question generation/selection with actual embedded content (~140 subtopics vs 100 hardcoded)
2. **Phase 1**: Selection Robustness Fixes - Address question repetition and React bias from postmortem analysis

## Phase 0: Dynamic Ontology Infrastructure (Prerequisite)

### Context

**Problem**: Mismatch between embedded content and hardcoded ontology

- Embedded `document_chunks`: ~140 distinct subtopics across 10 topics, 3,364 chunks
- Hardcoded `INTERVIEW_SUBTOPICS`: ~100 subtopics
- Many valuable subtopics ("Network Optimizations": 85 JS chunks, "Middleware": 17 Routing chunks) are inaccessible
- MCQ generation and LLM selector constrained by outdated ontology
- Contributes to repetition (smaller searchable space) and missed opportunities (can't target rich knowledge areas)

**Solution**: Hybrid caching (Option C)

- Static JSON file (`data/ontology-cache.json`) serves 99%+ of requests - zero DB cost
- 8-hour cache TTL with background refresh at 8-48 hours (non-blocking)
- Fallback to in-memory cache + DB query if static file missing
- Manual regeneration after major ingestion batches

### Tasks

#### Task 0.1: Create Ontology Generation Script

**File**: `scripts/generate-ontology.ts`

**Purpose**: Query DB for distinct subtopics and generate static cache file

**Implementation**:

```typescript
import { createServiceClient } from "@/utils/supabase.utils";
import { writeFileSync } from "fs";
import { join } from "path";

interface SubtopicData {
  topic: string;
  subtopic: string;
  chunk_count: number;
}

interface OntologyCache {
  lastGenerated: number;
  generatedAt: string;
  topics: Record<
    string,
    {
      subtopics: string[];
      chunkCounts: Record<string, number>;
      totalChunks: number;
    }
  >;
  metadata: {
    totalDistinctSubtopics: number;
    nullSubtopicCount: number;
    minChunksFilter: number;
  };
}

async function generateOntology() {
  console.log("Starting ontology generation from document_chunks...");

  const supabase = createServiceClient();

  // Query distinct subtopics with chunk counts (filter >= 3 chunks)
  const { data, error } = await supabase.rpc("get_subtopic_distribution", {
    min_chunks: 3,
  });

  // Fallback to direct query if RPC doesn't exist
  if (error || !data) {
    const { data: fallbackData, error: fallbackError } = await supabase
      .from("document_chunks")
      .select("labels")
      .not("labels->topic", "is", null)
      .not("labels->subtopic", "is", null)
      .neq("labels->subtopic", "");

    if (fallbackError) throw fallbackError;

    // Process results manually
    const countMap = new Map<string, SubtopicData>();
    fallbackData.forEach((row) => {
      const topic = row.labels?.topic;
      const subtopic = row.labels?.subtopic;
      if (!topic || !subtopic) return;

      const key = `${topic}::${subtopic}`;
      const existing = countMap.get(key);
      if (existing) {
        existing.chunk_count++;
      } else {
        countMap.set(key, { topic, subtopic, chunk_count: 1 });
      }
    });

    data = Array.from(countMap.values()).filter((item) => item.chunk_count >= 3);
  }

  // Build ontology structure
  const topics: OntologyCache["topics"] = {};
  let totalDistinctSubtopics = 0;

  (data as SubtopicData[]).forEach((row) => {
    if (!topics[row.topic]) {
      topics[row.topic] = {
        subtopics: [],
        chunkCounts: {},
        totalChunks: 0,
      };
    }

    // Normalize subtopic name (handle inconsistencies)
    const normalized = normalizeSubtopic(row.subtopic);

    if (!topics[row.topic].subtopics.includes(normalized)) {
      topics[row.topic].subtopics.push(normalized);
      totalDistinctSubtopics++;
    }

    topics[row.topic].chunkCounts[normalized] = (topics[row.topic].chunkCounts[normalized] || 0) + row.chunk_count;
    topics[row.topic].totalChunks += row.chunk_count;
  });

  // Sort subtopics by chunk count (descending)
  Object.values(topics).forEach((topicData) => {
    topicData.subtopics.sort((a, b) => topicData.chunkCounts[b] - topicData.chunkCounts[a]);
  });

  // Query null/empty subtopics for metadata
  const { count: nullCount } = await supabase
    .from("document_chunks")
    .select("id", { count: "exact", head: true })
    .not("labels->topic", "is", null)
    .or('labels->subtopic.is.null,labels->subtopic.eq.""');

  const ontology: OntologyCache = {
    lastGenerated: Date.now(),
    generatedAt: new Date().toISOString(),
    topics,
    metadata: {
      totalDistinctSubtopics,
      nullSubtopicCount: nullCount || 0,
      minChunksFilter: 3,
    },
  };

  // Write to file
  const outputPath = join(process.cwd(), "data", "ontology-cache.json");
  writeFileSync(outputPath, JSON.stringify(ontology, null, 2), "utf-8");

  console.log("✅ Ontology generated successfully!");
  console.log(`   Topics: ${Object.keys(topics).length}`);
  console.log(`   Distinct subtopics: ${totalDistinctSubtopics}`);
  console.log(`   Output: ${outputPath}`);

  // Print summary per topic
  Object.entries(topics).forEach(([topic, data]) => {
    console.log(`   - ${topic}: ${data.subtopics.length} subtopics, ${data.totalChunks} chunks`);
  });
}

function normalizeSubtopic(subtopic: string): string {
  // Handle common inconsistencies
  return subtopic
    .trim()
    .replace(/^Hooks\//, "Hooks: ") // "Hooks/useEffect" → "Hooks: useEffect"
    .replace(/\s+/g, " "); // Normalize whitespace
}

generateOntology().catch((error) => {
  console.error("❌ Ontology generation failed:", error);
  process.exit(1);
});
```

**Add RPC function** (optional optimization):

```sql
-- Add to new migration file
CREATE OR REPLACE FUNCTION get_subtopic_distribution(min_chunks INT DEFAULT 3)
RETURNS TABLE (
  topic TEXT,
  subtopic TEXT,
  chunk_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    labels->>'topic' as topic,
    labels->>'subtopic' as subtopic,
    COUNT(*) as chunk_count
  FROM document_chunks
  WHERE labels->>'topic' IS NOT NULL
    AND labels->>'subtopic' IS NOT NULL
    AND labels->>'subtopic' != ''
  GROUP BY labels->>'topic', labels->>'subtopic'
  HAVING COUNT(*) >= min_chunks
  ORDER BY labels->>'topic', COUNT(*) DESC;
END;
$$ LANGUAGE plpgsql STABLE;
```

**Add npm script** to `package.json`:

```json
{
  "scripts": {
    "generate:ontology": "tsx scripts/generate-ontology.ts"
  }
}
```

**Test**:

```bash
pnpm run generate:ontology
# Verify data/ontology-cache.json created with proper structure
```

---

#### Task 0.2: Create Runtime Ontology Utility

**File**: `utils/ontology.utils.ts`

**Purpose**: Load ontology with hybrid caching (static file → memory cache → DB fallback)

**Implementation**:

```typescript
import { createServiceClient } from "@/utils/supabase.utils";
import * as fs from "fs";
import * as path from "path";

interface OntologyCache {
  lastGenerated: number;
  generatedAt: string;
  topics: Record<
    string,
    {
      subtopics: string[];
      chunkCounts: Record<string, number>;
      totalChunks: number;
    }
  >;
}

// In-memory cache
let memoryCache: {
  data: Record<string, string[]>;
  timestamp: number;
} | null = null;

const MEMORY_CACHE_TTL = 8 * 60 * 60 * 1000; // 8 hours
const STALE_WARNING_AGE = 48 * 60 * 60 * 1000; // 48 hours
let isRefreshing = false;

/**
 * Get active subtopics by topic with hybrid caching strategy.
 *
 * Cache layers:
 * 1. Static file (data/ontology-cache.json) - zero DB cost, serves 99%+ requests
 * 2. In-memory cache (8-hour TTL) - fallback if static file missing
 * 3. DB query - last resort for cold starts
 *
 * Refresh triggers:
 * - 8-48 hours old: use cached, trigger background refresh (non-blocking)
 * - > 48 hours: use cached, log staleness warning
 *
 * @param options.forceRefresh - Skip all caches, query DB directly
 * @param options.minChunks - Filter threshold for subtopics (default: 3)
 */
export async function getActiveSubtopicsByTopic(options?: {
  forceRefresh?: boolean;
  minChunks?: number;
}): Promise<Record<string, string[]>> {
  const minChunks = options?.minChunks ?? 3;

  // Force refresh: skip all caches
  if (options?.forceRefresh) {
    return await queryDatabaseForSubtopics(minChunks);
  }

  // Layer 1: Try static file first
  const staticOntology = loadStaticOntology();
  if (staticOntology) {
    const age = Date.now() - staticOntology.lastGenerated;

    if (age < MEMORY_CACHE_TTL) {
      // Fresh: use immediately
      return staticOntology.data;
    } else if (age < STALE_WARNING_AGE) {
      // Slightly stale: use but trigger background refresh
      triggerBackgroundRefresh(minChunks);
      return staticOntology.data;
    } else {
      // Very stale: use but warn
      console.warn(`Ontology cache is ${Math.round(age / (60 * 60 * 1000))}h old. Consider regenerating.`);
      return staticOntology.data;
    }
  }

  // Layer 2: Check in-memory cache
  if (memoryCache && Date.now() - memoryCache.timestamp < MEMORY_CACHE_TTL) {
    return memoryCache.data;
  }

  // Layer 3: Query DB and populate cache
  console.log("Ontology cache miss, querying database...");
  const data = await queryDatabaseForSubtopics(minChunks);

  // Update memory cache
  memoryCache = {
    data,
    timestamp: Date.now(),
  };

  return data;
}

function loadStaticOntology(): {
  data: Record<string, string[]>;
  lastGenerated: number;
} | null {
  try {
    const filePath = path.join(process.cwd(), "data", "ontology-cache.json");
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const ontology: OntologyCache = JSON.parse(fileContent);

    // Transform to simpler structure
    const data: Record<string, string[]> = {};
    Object.entries(ontology.topics).forEach(([topic, topicData]) => {
      data[topic] = topicData.subtopics;
    });

    return {
      data,
      lastGenerated: ontology.lastGenerated,
    };
  } catch (error) {
    console.warn("Failed to load static ontology file:", error);
    return null;
  }
}

async function queryDatabaseForSubtopics(minChunks: number): Promise<Record<string, string[]>> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("document_chunks")
    .select("labels")
    .not("labels->topic", "is", null)
    .not("labels->subtopic", "is", null)
    .neq("labels->subtopic", "");

  if (error) throw error;

  // Aggregate subtopics by topic
  const topicMap = new Map<string, Map<string, number>>();

  data.forEach((row) => {
    const topic = row.labels?.topic;
    const subtopic = row.labels?.subtopic;
    if (!topic || !subtopic) return;

    if (!topicMap.has(topic)) {
      topicMap.set(topic, new Map());
    }

    const subtopicMap = topicMap.get(topic)!;
    subtopicMap.set(subtopic, (subtopicMap.get(subtopic) || 0) + 1);
  });

  // Filter by minChunks and convert to Record
  const result: Record<string, string[]> = {};
  topicMap.forEach((subtopicMap, topic) => {
    result[topic] = Array.from(subtopicMap.entries())
      .filter(([_, count]) => count >= minChunks)
      .map(([subtopic, _]) => subtopic)
      .sort();
  });

  return result;
}

function triggerBackgroundRefresh(minChunks: number): void {
  if (isRefreshing) return; // Already refreshing

  isRefreshing = true;

  queryDatabaseForSubtopics(minChunks)
    .then((data) => {
      memoryCache = { data, timestamp: Date.now() };
      console.log("✅ Background ontology refresh completed");
    })
    .catch((error) => {
      console.error("❌ Background ontology refresh failed:", error);
    })
    .finally(() => {
      isRefreshing = false;
    });
}

/**
 * Get subtopics for a specific topic
 */
export async function getSubtopicsForTopic(topic: string): Promise<string[]> {
  const all = await getActiveSubtopicsByTopic();
  return all[topic] || [];
}

/**
 * Get all available topics (union of ontology + DB)
 */
export async function getAllTopics(): Promise<string[]> {
  const all = await getActiveSubtopicsByTopic();
  return Object.keys(all).sort();
}

/**
 * Get ontology cache metadata (for admin/monitoring)
 */
export async function getOntologyCacheStatus(): Promise<{
  source: "static" | "memory" | "db";
  age: number; // milliseconds
  lastGenerated: string; // ISO timestamp
  isStale: boolean;
  topics: string[];
  totalSubtopics: number;
}> {
  const staticOntology = loadStaticOntology();

  if (staticOntology) {
    const age = Date.now() - staticOntology.lastGenerated;
    return {
      source: "static",
      age,
      lastGenerated: new Date(staticOntology.lastGenerated).toISOString(),
      isStale: age > MEMORY_CACHE_TTL,
      topics: Object.keys(staticOntology.data),
      totalSubtopics: Object.values(staticOntology.data).reduce((sum, arr) => sum + arr.length, 0),
    };
  }

  if (memoryCache) {
    const age = Date.now() - memoryCache.timestamp;
    return {
      source: "memory",
      age,
      lastGenerated: new Date(memoryCache.timestamp).toISOString(),
      isStale: age > MEMORY_CACHE_TTL,
      topics: Object.keys(memoryCache.data),
      totalSubtopics: Object.values(memoryCache.data).reduce((sum, arr) => sum + arr.length, 0),
    };
  }

  return {
    source: "db",
    age: 0,
    lastGenerated: new Date().toISOString(),
    isStale: true,
    topics: [],
    totalSubtopics: 0,
  };
}
```

**Test**: Create unit tests in `tests/utils/ontology.utils.spec.ts`

---

#### Task 0.3: Integrate Dynamic Ontology into AI Services

**Files to modify**:

- `services/ai.services.ts`
- `utils/mcq-prompt.utils.ts`

**Changes**:

1. **Update `classifyLabels()` function**:

```typescript
import { getActiveSubtopicsByTopic } from "@/utils/ontology.utils";

export async function classifyLabels(args: {
  urlOrPath: string;
  siteOrRepo: string;
  title?: string;
  allowedTopics: string[];
  allowedSubtopicsByTopic?: Record<string, string[]>; // Make optional
  topicHint?: string;
}): Promise<{ topic: string; subtopic: string | null; version: string | null; confidence: number }> {
  // Get dynamic ontology if not provided
  const subtopicsByTopic = args.allowedSubtopicsByTopic || (await getActiveSubtopicsByTopic());

  // Rest of function remains the same, use subtopicsByTopic instead of args.allowedSubtopicsByTopic
  // ...
}
```

2. **Update `generateMcqFromContext()` function**:

```typescript
import { getSubtopicsForTopic } from "@/utils/ontology.utils";

export async function generateMcqFromContext(args: {
  topic: string;
  subtopic?: string | null;
  // ... other args
}): Promise<IMcqItemView> {
  // Fetch available subtopics for this topic
  const availableSubtopics = await getSubtopicsForTopic(args.topic);

  // Update prompt to include available subtopics
  const { system, user } = buildGeneratorMessages({
    ...args,
    availableSubtopics, // Pass to prompt builder
  });

  // Rest remains the same
  // ...
}
```

3. **Update `selectNextQuestion()` function**:

```typescript
import { getAllTopics, getActiveSubtopicsByTopic } from "@/utils/ontology.utils";

export async function selectNextQuestion(context: {
  // ... existing params
}): Promise<{
  difficulty: EDifficulty;
  coding_mode: boolean;
  preferred_topics: string[];
  preferred_subtopics: string[];
  preferred_bloom_levels: EBloomLevel[];
  reasoning: string;
}> {
  // Fetch dynamic ontology
  const allTopics = await getAllTopics();
  const subtopicsByTopic = await getActiveSubtopicsByTopic();

  // Count available subtopics
  const totalAvailableSubtopics = Object.values(subtopicsByTopic).reduce((sum, arr) => sum + arr.length, 0);

  // Update prompt to include this info
  const system = `You are selecting from ${allTopics.length} topics with ${totalAvailableSubtopics} available subtopics...`;

  // Rest remains the same
  // ...
}
```

---

#### Task 0.4: Create Admin Ontology Status Endpoint

**File**: `app/api/ontology/status/route.ts`

```typescript
import { NextResponse } from "next/server";
import { getOntologyCacheStatus } from "@/utils/ontology.utils";

export async function GET() {
  try {
    const status = await getOntologyCacheStatus();

    return NextResponse.json({
      success: true,
      status,
      warnings: status.isStale ? ["Cache is stale, consider regenerating"] : [],
    });
  } catch (error) {
    console.error("Failed to get ontology status:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch ontology status" }, { status: 500 });
  }
}
```

---

#### Task 0.5: Initial Generation and Documentation

**Steps**:

1. Run generation script:

```bash
pnpm run generate:ontology
```

2. Verify output:

```bash
cat data/ontology-cache.json | jq '.metadata'
# Should show ~140 distinct subtopics
```

3. Commit to git:

```bash
git add data/ontology-cache.json
git commit -m "feat: add dynamic ontology cache from embedded content"
```

4. Document in README or scripts/README.md:

````markdown
## Ontology Cache Management

The application uses a dynamic ontology cache derived from embedded content in `document_chunks`.

### Regeneration (After Major Ingestion)

```bash
# Query DB and generate static cache file
pnpm run generate:ontology

# Commit updated cache
git add data/ontology-cache.json
git commit -m "chore: update ontology cache after ingestion"
```
````

### Cache Behavior

- **Fresh (<8 hours)**: Used immediately, zero DB queries
- **Stale (8-48 hours)**: Used immediately, background refresh triggered
- **Very stale (>48 hours)**: Used with warning, manual regeneration recommended

### Monitoring

Check cache status:

```bash
curl http://localhost:3050/api/ontology/status
```

Response includes:

- Source (static/memory/db)
- Age (milliseconds since generation)
- Staleness flag
- Topic count and subtopic count

```

---

## Phase 1: Selection Robustness Fixes

*[Comprehensive implementation details for selection fixes from postmortem]*

*Due to message length, Phase 1 details are documented separately in the evaluate-page.md file under "Engineering ToDos (Actionable Checklist)" and can be expanded here as needed.*

---

## Acceptance Criteria Summary

### Phase 0 Success Metrics:
- ✅ Static file loads in < 5ms (zero DB cost)
- ✅ Cache valid for 8 hours, background refresh at 8-48 hours
- ✅ All ~140 DB subtopics accessible to generation/selection
- ✅ Regeneration script runs in < 10 seconds
- ✅ Git tracks ontology evolution

### Phase 1 Success Metrics:
- ✅ Zero intra-attempt duplicates
- ✅ < 25% cross-attempt repetition with adequate bank
- ✅ Dynamic topic caps enforced (30%/35%/40% by stage)
- ✅ Resume anti-cluster rule active
- ✅ Fallback uses weighted random (not React default)
- ✅ Structured logging for all selection events

---

## Next Steps for Implementation

1. Start with Phase 0 (Dynamic Ontology) - takes 4-6 hours
2. Test integration with existing MCQ generation
3. Move to Phase 1 (Selection Fixes) - takes 8-12 hours
4. Add comprehensive test suite
5. Deploy with monitoring and alerts

```
