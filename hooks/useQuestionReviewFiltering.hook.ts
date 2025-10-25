import { useEffect, useMemo, useRef, useState } from "react";
import type { IQuestionReview } from "@/types/evaluate.types";
import { QUESTION_REVIEW_LABELS } from "@/constants/evaluate.constants";

export function useQuestionReviewFiltering(questions: IQuestionReview[]) {
  const [showOnlyIncorrect, setShowOnlyIncorrect] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<string>("all");
  const [itemsToShow, setItemsToShow] = useState(20);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<"order" | "difficulty" | "topic">("order");
  const [groupMode, setGroupMode] = useState<"none" | "topic" | "difficulty">("none");
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const filteredQuestions = useMemo(() => {
    const base = questions.filter((q) => {
      if (showOnlyIncorrect && q.is_correct) return false;
      if (selectedTopic !== "all" && q.metadata.topic !== selectedTopic) return false;
      if (searchQuery.trim().length > 0) {
        const query = searchQuery.toLowerCase();
        const matchesText = q.question_text.toLowerCase().includes(query);
        const matchesExplanation = q.explanation?.toLowerCase().includes(query);
        const matchesMetadata =
          q.metadata.subtopic?.toLowerCase().includes(query) ||
          q.metadata.bloom_level.toLowerCase().includes(query) ||
          q.metadata.difficulty.toLowerCase().includes(query);
        if (!matchesText && !matchesExplanation && !matchesMetadata) {
          return false;
        }
      }
      return true;
    });

    const sorted = [...base];
    if (sortMode === "order") {
      sorted.sort((a, b) => a.question_order - b.question_order);
    }
    if (sortMode === "difficulty") {
      const rank: Record<string, number> = { Easy: 0, Medium: 1, Hard: 2 };
      sorted.sort((a, b) => rank[a.metadata.difficulty] - rank[b.metadata.difficulty]);
    }
    if (sortMode === "topic") {
      sorted.sort((a, b) => a.metadata.topic.localeCompare(b.metadata.topic));
    }
    return sorted;
  }, [questions, showOnlyIncorrect, selectedTopic, searchQuery, sortMode]);

  const groupedQuestions = useMemo(() => {
    if (groupMode === "none") {
      return [{ groupKey: QUESTION_REVIEW_LABELS.ALL_QUESTIONS_GROUP, items: filteredQuestions }];
    }

    const map = new Map<string, IQuestionReview[]>();
    filteredQuestions.forEach((question) => {
      const key =
        groupMode === "topic"
          ? question.metadata.topic
          : `${question.metadata.difficulty} • ${question.metadata.topic}`;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)?.push(question);
    });

    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([groupKey, items]) => ({ groupKey, items }));
  }, [filteredQuestions, groupMode]);

  const uniqueTopics = useMemo(() => Array.from(new Set(questions.map((q) => q.metadata.topic))), [questions]);

  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting) {
          setItemsToShow((prev) => Math.min(prev + 20, filteredQuestions.length));
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [filteredQuestions.length]);

  return {
    showOnlyIncorrect,
    setShowOnlyIncorrect,
    selectedTopic,
    setSelectedTopic,
    itemsToShow,
    setItemsToShow,
    searchQuery,
    setSearchQuery,
    sortMode,
    setSortMode,
    groupMode,
    setGroupMode,
    sentinelRef,
    filteredQuestions,
    groupedQuestions,
    uniqueTopics,
  };
}
