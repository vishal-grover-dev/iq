/**
 * Mock question data fixtures for testing
 * Provides realistic question data covering all dimensions for comprehensive testing
 */

import { EDifficulty, EBloomLevel } from "@/types/mcq.types";
import type { IEvaluationQuestion, IQuestionMetadata } from "@/types/evaluate.types";

/**
 * Easy React question (non-coding)
 */
export const mockEasyReactQuestion: IEvaluationQuestion = {
  id: "q-easy-react-1",
  question: "What is the primary purpose of React?",
  options: ["To build user interfaces", "To manage databases", "To handle server requests", "To optimize images"],
  code: null,
  metadata: {
    topic: "React",
    subtopic: "Fundamentals",
    difficulty: EDifficulty.EASY,
    bloom_level: EBloomLevel.REMEMBER,
    question_order: 1,
    coding_mode: false,
  },
};

/**
 * Medium React question (coding)
 */
export const mockMediumReactQuestion: IEvaluationQuestion = {
  id: "q-medium-react-1",
  question: "What will be logged to the console when this component renders?",
  options: ["Component mounted", "Component updated", "Component unmounted", "Nothing will be logged"],
  code: `import React, { useEffect } from 'react';

function MyComponent() {
  useEffect(() => {
    console.log('Component mounted');
    return () => console.log('Component unmounted');
  }, []);
  
  return <div>Hello World</div>;
}`,
  metadata: {
    topic: "React",
    subtopic: "Hooks: useEffect",
    difficulty: EDifficulty.MEDIUM,
    bloom_level: EBloomLevel.UNDERSTAND,
    question_order: 2,
    coding_mode: true,
  },
};

/**
 * Hard React question (coding)
 */
export const mockHardReactQuestion: IEvaluationQuestion = {
  id: "q-hard-react-1",
  question: "How would you optimize this component to prevent unnecessary re-renders?",
  options: [
    "Wrap the component with React.memo",
    "Use useCallback for the event handler",
    "Both A and B",
    "Neither A nor B",
  ],
  code: `import React, { useState } from 'react';

function ExpensiveComponent({ items, onItemClick }) {
  const [selectedId, setSelectedId] = useState(null);
  
  const handleClick = (id) => {
    setSelectedId(id);
    onItemClick(id);
  };
  
  return (
    <div>
      {items.map(item => (
        <div key={item.id} onClick={() => handleClick(item.id)}>
          {item.name}
        </div>
      ))}
    </div>
  );
}`,
  metadata: {
    topic: "React",
    subtopic: "Performance: Memoization",
    difficulty: EDifficulty.HARD,
    bloom_level: EBloomLevel.ANALYZE,
    question_order: 3,
    coding_mode: true,
  },
};

/**
 * JavaScript question (non-coding)
 */
export const mockJavaScriptQuestion: IEvaluationQuestion = {
  id: "q-js-1",
  question: "What is the difference between 'let' and 'var' in JavaScript?",
  options: [
    "let has block scope, var has function scope",
    "var has block scope, let has function scope",
    "There is no difference",
    "let is deprecated, use var instead",
  ],
  code: null,
  metadata: {
    topic: "JavaScript",
    subtopic: "Variables: Scope",
    difficulty: EDifficulty.MEDIUM,
    bloom_level: EBloomLevel.UNDERSTAND,
    question_order: 4,
    coding_mode: false,
  },
};

/**
 * TypeScript question (coding)
 */
export const mockTypeScriptQuestion: IEvaluationQuestion = {
  id: "q-ts-1",
  question: "What is the correct TypeScript type for this function parameter?",
  options: ["User[]", "Array<User>", "Both A and B are correct", "Neither A nor B"],
  code: `interface User {
  id: number;
  name: string;
  email: string;
}

function processUsers(users: ???) {
  return users.map(user => user.name);
}`,
  metadata: {
    topic: "TypeScript",
    subtopic: "Types: Arrays",
    difficulty: EDifficulty.MEDIUM,
    bloom_level: EBloomLevel.APPLY,
    question_order: 5,
    coding_mode: true,
  },
};

/**
 * HTML question (non-coding)
 */
export const mockHTMLQuestion: IEvaluationQuestion = {
  id: "q-html-1",
  question: "Which HTML element is used to define the main content of a document?",
  options: ["<main>", "<content>", "<body>", "<section>"],
  code: null,
  metadata: {
    topic: "HTML",
    subtopic: "Semantic Elements",
    difficulty: EDifficulty.EASY,
    bloom_level: EBloomLevel.REMEMBER,
    question_order: 6,
    coding_mode: false,
  },
};

/**
 * CSS question (coding)
 */
export const mockCSSQuestion: IEvaluationQuestion = {
  id: "q-css-1",
  question: "What will be the final color of the text in this CSS?",
  options: ["Red", "Blue", "Green", "Purple"],
  code: `.text {
  color: red;
}

.text {
  color: blue;
}

.text {
  color: green !important;
}`,
  metadata: {
    topic: "CSS",
    subtopic: "Specificity",
    difficulty: EDifficulty.MEDIUM,
    bloom_level: EBloomLevel.APPLY,
    question_order: 7,
    coding_mode: true,
  },
};

/**
 * State Management question (non-coding)
 */
export const mockStateManagementQuestion: IEvaluationQuestion = {
  id: "q-state-1",
  question: "What is the main advantage of using Redux for state management?",
  options: ["Predictable state updates", "Better performance", "Smaller bundle size", "Easier debugging"],
  code: null,
  metadata: {
    topic: "State Management",
    subtopic: "Redux",
    difficulty: EDifficulty.MEDIUM,
    bloom_level: EBloomLevel.UNDERSTAND,
    question_order: 8,
    coding_mode: false,
  },
};

/**
 * Routing question (coding)
 */
export const mockRoutingQuestion: IEvaluationQuestion = {
  id: "q-routing-1",
  question: "How would you implement a protected route in React Router?",
  options: ["Use a Higher-Order Component", "Use a custom hook", "Use route guards", "All of the above"],
  code: `// Protected Route Component
function ProtectedRoute({ children }) {
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  return children;
}`,
  metadata: {
    topic: "Routing",
    subtopic: "Route Protection",
    difficulty: EDifficulty.HARD,
    bloom_level: EBloomLevel.APPLY,
    question_order: 9,
    coding_mode: true,
  },
};

/**
 * Accessibility question (non-coding)
 */
export const mockAccessibilityQuestion: IEvaluationQuestion = {
  id: "q-a11y-1",
  question: "What is the purpose of the 'aria-label' attribute?",
  options: [
    "To provide accessible names for elements",
    "To hide elements from screen readers",
    "To change element styling",
    "To improve performance",
  ],
  code: null,
  metadata: {
    topic: "Accessibility",
    subtopic: "ARIA",
    difficulty: EDifficulty.EASY,
    bloom_level: EBloomLevel.REMEMBER,
    question_order: 10,
    coding_mode: false,
  },
};

/**
 * Testing question (coding)
 */
export const mockTestingQuestion: IEvaluationQuestion = {
  id: "q-testing-1",
  question: "What is the correct way to test this React component?",
  options: [
    "Use render() and screen.getByText()",
    "Use shallow() and find()",
    "Use mount() and wrapper.find()",
    "Use any of the above",
  ],
  code: `import React from 'react';

function Button({ onClick, children }) {
  return (
    <button onClick={onClick} className="btn">
      {children}
    </button>
  );
}`,
  metadata: {
    topic: "Testing",
    subtopic: "Component Testing",
    difficulty: EDifficulty.HARD,
    bloom_level: EBloomLevel.EVALUATE,
    question_order: 11,
    coding_mode: true,
  },
};

/**
 * PWA question (non-coding)
 */
export const mockPWAQuestion: IEvaluationQuestion = {
  id: "q-pwa-1",
  question: "What is the main purpose of a Service Worker in a PWA?",
  options: [
    "To cache resources and enable offline functionality",
    "To improve SEO",
    "To reduce bundle size",
    "To handle user authentication",
  ],
  code: null,
  metadata: {
    topic: "PWA",
    subtopic: "Service Workers",
    difficulty: EDifficulty.MEDIUM,
    bloom_level: EBloomLevel.UNDERSTAND,
    question_order: 12,
    coding_mode: false,
  },
};

/**
 * Collection of questions for different test scenarios
 */
export const mockQuestionCollection = {
  // Questions for difficulty distribution testing
  easyQuestions: [mockEasyReactQuestion, mockHTMLQuestion, mockAccessibilityQuestion],

  mediumQuestions: [
    mockMediumReactQuestion,
    mockJavaScriptQuestion,
    mockTypeScriptQuestion,
    mockCSSQuestion,
    mockStateManagementQuestion,
    mockPWAQuestion,
  ],

  hardQuestions: [mockHardReactQuestion, mockRoutingQuestion, mockTestingQuestion],

  // Questions for coding threshold testing
  codingQuestions: [
    mockMediumReactQuestion,
    mockHardReactQuestion,
    mockTypeScriptQuestion,
    mockCSSQuestion,
    mockRoutingQuestion,
    mockTestingQuestion,
  ],

  nonCodingQuestions: [
    mockEasyReactQuestion,
    mockJavaScriptQuestion,
    mockHTMLQuestion,
    mockStateManagementQuestion,
    mockAccessibilityQuestion,
    mockPWAQuestion,
  ],

  // Questions for topic distribution testing
  reactQuestions: [mockEasyReactQuestion, mockMediumReactQuestion, mockHardReactQuestion],

  javascriptQuestions: [mockJavaScriptQuestion],

  typescriptQuestions: [mockTypeScriptQuestion],

  htmlQuestions: [mockHTMLQuestion],

  cssQuestions: [mockCSSQuestion],

  // All questions for comprehensive testing
  allQuestions: [
    mockEasyReactQuestion,
    mockMediumReactQuestion,
    mockHardReactQuestion,
    mockJavaScriptQuestion,
    mockTypeScriptQuestion,
    mockHTMLQuestion,
    mockCSSQuestion,
    mockStateManagementQuestion,
    mockRoutingQuestion,
    mockAccessibilityQuestion,
    mockTestingQuestion,
    mockPWAQuestion,
  ],
};

/**
 * Question metadata for distribution testing
 */
export const mockQuestionMetadata = {
  difficulties: {
    easy: 3,
    medium: 6,
    hard: 3,
  },
  topics: {
    React: 3,
    JavaScript: 1,
    TypeScript: 1,
    HTML: 1,
    CSS: 1,
    "State Management": 1,
    Routing: 1,
    Accessibility: 1,
    Testing: 1,
    PWA: 1,
  },
  bloomLevels: {
    Remember: 3,
    Understand: 4,
    Apply: 3,
    Analyze: 1,
    Evaluate: 1,
    Create: 0,
  },
  codingMode: {
    true: 6, // 50% coding questions
    false: 6, // 50% non-coding questions
  },
};

/**
 * Generate a question with specific characteristics
 */
export function generateMockQuestion(overrides: Partial<IEvaluationQuestion> = {}): IEvaluationQuestion {
  return {
    id: `q-generated-${Date.now()}`,
    question: "What is the correct answer?",
    options: ["Option A", "Option B", "Option C", "Option D"],
    code: null,
    metadata: {
      topic: "React",
      subtopic: "Fundamentals",
      difficulty: EDifficulty.EASY,
      bloom_level: EBloomLevel.REMEMBER,
      question_order: 1,
      coding_mode: false,
    },
    ...overrides,
  };
}

/**
 * Generate multiple questions for testing
 */
export function generateMockQuestions(
  count: number,
  baseQuestion: IEvaluationQuestion = mockEasyReactQuestion
): IEvaluationQuestion[] {
  return Array.from({ length: count }, (_, index) => ({
    ...baseQuestion,
    id: `${baseQuestion.id}-${index}`,
    metadata: {
      ...baseQuestion.metadata,
      question_order: index + 1,
    },
  }));
}
