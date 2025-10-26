/**
 * AI-Generated Question Pattern Detection Tests
 *
 * Tests for detecting semantic similarity in AI-generated questions.
 * Catches questions that are essentially the same but with different wording,
 * paraphrasing, synonym usage, or structural variations.
 */

import { test, expect } from "@playwright/test";
import { toHaveUniqueContent } from "../utils/customMatchers.utils";

test.describe("AI-Generated Question Pattern Detection", () => {
  test("should detect synonym substitution patterns", async () => {
    const questions = [
      {
        id: "q1",
        question: "What is the purpose of the useState hook in React?",
      },
      {
        id: "q2",
        question: "What is the function of the useState hook in React?",
      },
    ];

    // These should be detected as similar due to synonym substitution
    await expect(async () => {
      await toHaveUniqueContent(questions, 0.6);
    }).rejects.toThrow(/Found.*potentially duplicate question pairs/);
  });

  test("should detect structural reordering", async () => {
    const questions = [
      {
        id: "q1",
        question: "How do you create a new component in React?",
      },
      {
        id: "q2",
        question: "In React, how do you create a new component?",
      },
    ];

    // These should be detected as similar due to structural reordering
    await expect(async () => {
      await toHaveUniqueContent(questions, 0.6);
    }).rejects.toThrow(/Found.*potentially duplicate question pairs/);
  });

  test("should detect question type variations", async () => {
    const questions = [
      {
        id: "q1",
        question: "What is the difference between let and const in JavaScript?",
      },
      {
        id: "q2",
        question: "Which statement correctly describes the difference between let and const in JavaScript?",
      },
    ];

    // These should be detected as similar due to question type variation
    await expect(async () => {
      await toHaveUniqueContent(questions, 0.6);
    }).rejects.toThrow(/Found.*potentially duplicate question pairs/);
  });

  test("should detect tense/voice changes", async () => {
    const questions = [
      {
        id: "q1",
        question: "How is a function defined in JavaScript?",
      },
      {
        id: "q2",
        question: "How do you define a function in JavaScript?",
      },
    ];

    // These should be detected as similar due to voice changes
    await expect(async () => {
      await toHaveUniqueContent(questions, 0.6);
    }).rejects.toThrow(/Found.*potentially duplicate question pairs/);
  });

  test("should detect negation patterns", async () => {
    const questions = [
      {
        id: "q1",
        question: "What happens when you don't use the key prop in React lists?",
      },
      {
        id: "q2",
        question: "What occurs when you omit the key prop in React lists?",
      },
    ];

    // These should be detected as similar due to negation patterns
    await expect(async () => {
      await toHaveUniqueContent(questions, 0.6);
    }).rejects.toThrow(/Found.*potentially duplicate question pairs/);
  });

  test("should detect AI paraphrasing patterns", async () => {
    const questions = [
      {
        id: "q1",
        question: "What is the primary purpose of the useEffect hook in React functional components?",
      },
      {
        id: "q2",
        question: "What is the main function of the useEffect hook in React functional components?",
      },
    ];

    // These should be detected as similar due to AI paraphrasing
    await expect(async () => {
      await toHaveUniqueContent(questions, 0.6);
    }).rejects.toThrow(/Found.*potentially duplicate question pairs/);
  });

  test("should detect concept overlap in different phrasings", async () => {
    const questions = [
      {
        id: "q1",
        question: "How do you handle state management in React applications?",
      },
      {
        id: "q2",
        question: "What are the different approaches to managing state in React apps?",
      },
    ];

    // These should be detected as similar due to concept overlap
    await expect(async () => {
      await toHaveUniqueContent(questions, 0.6);
    }).rejects.toThrow(/Found.*potentially duplicate question pairs/);
  });

  test("should detect same content with different question words", async () => {
    const questions = [
      {
        id: "q1",
        question: "What is the purpose of the virtual DOM in React?",
      },
      {
        id: "q2",
        question: "Why is the virtual DOM used in React?",
      },
    ];

    // These should be detected as similar due to same core concept
    await expect(async () => {
      await toHaveUniqueContent(questions, 0.6);
    }).rejects.toThrow(/Found.*potentially duplicate question pairs/);
  });

  test("should detect structural variations with same meaning", async () => {
    const questions = [
      {
        id: "q1",
        question: "In React, what is the difference between props and state?",
      },
      {
        id: "q2",
        question: "What distinguishes props from state in React?",
      },
    ];

    // These should be detected as similar due to structural variation
    await expect(async () => {
      await toHaveUniqueContent(questions, 0.6);
    }).rejects.toThrow(/Found.*potentially duplicate question pairs/);
  });

  test("should detect AI-generated variations of the same question", async () => {
    const questions = [
      {
        id: "q1",
        question: "How do you pass data from parent to child components in React?",
      },
      {
        id: "q2",
        question: "What is the method for transferring data from parent components to child components in React?",
      },
    ];

    // These should be detected as similar due to AI variation
    await expect(async () => {
      await toHaveUniqueContent(questions, 0.6);
    }).rejects.toThrow(/Found.*potentially duplicate question pairs/);
  });

  test("should allow genuinely different questions to pass", async () => {
    const questions = [
      {
        id: "q1",
        question: "What is the purpose of the useState hook in React?",
      },
      {
        id: "q2",
        question: "How do you implement error boundaries in React?",
      },
      {
        id: "q3",
        question: "What is the difference between controlled and uncontrolled components?",
      },
    ];

    // These should pass as they are genuinely different questions
    await expect(async () => {
      await toHaveUniqueContent(questions, 0.6);
    }).not.toThrow();
  });

  test("should detect complex AI paraphrasing with multiple variations", async () => {
    const questions = [
      {
        id: "q1",
        question: "What is the primary benefit of using React hooks over class components?",
      },
      {
        id: "q2",
        question: "What is the main advantage of utilizing React hooks instead of class components?",
      },
    ];

    // These should be detected as similar due to complex paraphrasing
    await expect(async () => {
      await toHaveUniqueContent(questions, 0.6);
    }).rejects.toThrow(/Found.*potentially duplicate question pairs/);
  });

  test("should detect questions with same core concept but different framing", async () => {
    const questions = [
      {
        id: "q1",
        question: "How do you prevent unnecessary re-renders in React components?",
      },
      {
        id: "q2",
        question: "What techniques can be used to avoid unnecessary re-renders in React components?",
      },
    ];

    // These should be detected as similar due to same core concept
    await expect(async () => {
      await toHaveUniqueContent(questions, 0.6);
    }).rejects.toThrow(/Found.*potentially duplicate question pairs/);
  });

  test("should provide detailed error messages for detected patterns", async () => {
    const questions = [
      {
        id: "q1",
        question: "What is the purpose of the useEffect hook in React?",
      },
      {
        id: "q2",
        question: "What is the function of the useEffect hook in React?",
      },
    ];

    try {
      await toHaveUniqueContent(questions, 0.6);
    } catch (error) {
      const errorMessage = error.message;

      // Should contain detailed information about the detected similarity
      expect(errorMessage).toContain("Found");
      expect(errorMessage).toContain("potentially duplicate question pairs");
      expect(errorMessage).toContain("Questions 1 & 2");
      expect(errorMessage).toContain("similarity via");
      expect(errorMessage).toContain("Q1:");
      expect(errorMessage).toContain("Q2:");
    }
  });

  test("should detect questions with same technical concept but different wording", async () => {
    const questions = [
      {
        id: "q1",
        question: "What is the difference between shallow and deep copying in JavaScript?",
      },
      {
        id: "q2",
        question: "How do shallow copy and deep copy differ in JavaScript?",
      },
    ];

    // These should be detected as similar due to same technical concept
    await expect(async () => {
      await toHaveUniqueContent(questions, 0.6);
    }).rejects.toThrow(/Found.*potentially duplicate question pairs/);
  });

  test("should detect questions with same learning objective but different phrasing", async () => {
    const questions = [
      {
        id: "q1",
        question: "What is the purpose of the key prop in React lists?",
      },
      {
        id: "q2",
        question: "Why is the key prop important when rendering lists in React?",
      },
    ];

    // These should be detected as similar due to same learning objective
    await expect(async () => {
      await toHaveUniqueContent(questions, 0.6);
    }).rejects.toThrow(/Found.*potentially duplicate question pairs/);
  });
});
