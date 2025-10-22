import { SupabaseClient } from "@supabase/supabase-js";
import { TCandidateWithSimilarity, TScoredCandidate, TSelectionCriteria } from "@/types/evaluate.types";
import { toNumericVector, cosineSimilarity } from "@/utils/vector.utils";
import { weightedRandomIndex } from "@/utils/selection.utils";
import { EVALUATE_SELECTION_CONFIG } from "@/constants/evaluate.constants";

export async function applyNeighborSimilarityChecks(
  candidates: any[],
  askedEmbeddings: number[][],
  userId: string,
  supabase: SupabaseClient,
  attemptId: string
): Promise<TCandidateWithSimilarity[]> {
  return await Promise.all(
    candidates.map(async (candidate: any) => {
      let similarityPenalty = 0;
      let similarityMetrics: any = {};

      try {
        if (askedEmbeddings.length > 0) {
          const candidateEmbedding = toNumericVector(candidate.embedding);
          if (candidateEmbedding) {
            const similarityScores = askedEmbeddings.map((vector: number[]) =>
              cosineSimilarity(vector, candidateEmbedding)
            );
            const topSimilarity = similarityScores.length ? Math.max(...similarityScores) : 0;

            similarityMetrics.attempt_similarity = {
              scores: similarityScores.slice(0, 5),
              top_score: topSimilarity,
            };

            const { BANK_THRESHOLD_HIGH, BANK_THRESHOLD_MEDIUM } = EVALUATE_SELECTION_CONFIG.SIMILARITY;
            const { BANK_SIMILARITY_HIGH, BANK_SIMILARITY_MEDIUM } = EVALUATE_SELECTION_CONFIG.PENALTIES;

            if (topSimilarity >= BANK_THRESHOLD_HIGH) {
              similarityPenalty += BANK_SIMILARITY_HIGH;
            } else if (topSimilarity >= BANK_THRESHOLD_MEDIUM) {
              similarityPenalty += BANK_SIMILARITY_MEDIUM;
            }
          }
        }

        try {
          const candidateEmbedding = toNumericVector(candidate.embedding);
          if (candidateEmbedding) {
            const { data: neighborRows } = await supabase.rpc("retrieval_mcq_neighbors", {
              p_user_id: userId,
              p_topic: candidate.topic,
              p_embedding: candidateEmbedding as unknown as any,
              p_subtopic: candidate.subtopic,
              p_topk: 5,
            });

            const neighborScores: Array<{ question: string; score: number }> = (neighborRows ?? []).map((r: any) => ({
              question: String(r?.question || ""),
              score: Number(r?.score || 0),
            }));

            similarityMetrics.neighbor_similarity = {
              scores: neighborScores.slice(0, 3).map((n) => n.score),
              top_score: neighborScores[0]?.score || 0,
            };

            const { BANK_THRESHOLD_HIGH } = EVALUATE_SELECTION_CONFIG.SIMILARITY;
            const { BANK_NEIGHBOR_HIGH, BANK_NEIGHBOR_MEDIUM } = EVALUATE_SELECTION_CONFIG.PENALTIES;

            const topNeighbor = neighborScores[0];
            if (topNeighbor && topNeighbor.score >= BANK_THRESHOLD_HIGH) {
              similarityPenalty += BANK_NEIGHBOR_HIGH;
            } else if (topNeighbor && topNeighbor.score >= EVALUATE_SELECTION_CONFIG.SIMILARITY.BANK_THRESHOLD_MEDIUM) {
              similarityPenalty += BANK_NEIGHBOR_MEDIUM;
            }
          }
        } catch (neighborError: any) {
          console.warn("bank_neighbor_similarity_check_failed", {
            message: neighborError?.message || String(neighborError),
            candidate_id: candidate.id,
          });
        }
      } catch (e: any) {
        console.warn("bank_similarity_check_failed", {
          message: e?.message || String(e),
          candidate_id: candidate.id,
        });
      }

      return {
        ...candidate,
        similarityPenalty,
        similarityMetrics,
      };
    })
  );
}

export function scoreCandidate(
  candidate: TCandidateWithSimilarity,
  criteria: TSelectionCriteria,
  distributions: any,
  attempt: any
): number {
  let score = 0;

  const { TOPIC_BOOST, SUBTOPIC_BOOST, BLOOM_BOOST, CODING_BOOST } = EVALUATE_SELECTION_CONFIG.CANDIDATE_SCORING;

  if (criteria.preferred_topic === candidate.topic) score += TOPIC_BOOST;
  if (criteria.preferred_subtopic === candidate.subtopic) score += SUBTOPIC_BOOST;
  if (criteria.preferred_bloom_level.toString() === candidate.bloom_level) score += BLOOM_BOOST;
  if (criteria.coding_mode && candidate.code) score += CODING_BOOST;

  const answered = attempt.questions_answered;
  const { EARLY_STAGE_THRESHOLD, MID_STAGE_THRESHOLD, EARLY_STAGE_CAP, MID_STAGE_CAP } =
    EVALUATE_SELECTION_CONFIG.TOPIC_BALANCE;
  const { EARLY_PENALTY, MID_PENALTY } = EVALUATE_SELECTION_CONFIG.TOPIC_BALANCE;

  const topicCount = distributions.topic_distribution[candidate.topic] || 0;
  if (answered <= EARLY_STAGE_THRESHOLD && topicCount >= EARLY_STAGE_CAP) {
    score -= EARLY_PENALTY;
  } else if (answered <= MID_STAGE_THRESHOLD && topicCount >= MID_STAGE_CAP) {
    score -= MID_PENALTY;
  }

  if (candidate._seenRecently) score -= EVALUATE_SELECTION_CONFIG.PENALTIES.CROSS_ATTEMPT_FRESHNESS;
  score -= candidate.similarityPenalty || 0;

  return score;
}

export function selectTopKWithWeights(scoredCandidates: TScoredCandidate[]): TScoredCandidate[] {
  const K = Math.min(EVALUATE_SELECTION_CONFIG.CANDIDATE_SCORING.TOPK_COUNT, scoredCandidates.length);
  const topK = scoredCandidates.slice(0, K);
  const weights = topK.map((c) => Math.max(1, c.score));
  const chosenIdx = weightedRandomIndex(weights);

  return [...topK.slice(chosenIdx, chosenIdx + 1), ...topK.slice(0, chosenIdx), ...scoredCandidates.slice(K)];
}
