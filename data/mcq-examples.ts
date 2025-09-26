export type TExample = {
  statement: string;
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
  difficulty: string;
  bloomLevel: string;
  explanation: string;
  explanationBullets: string[];
  citations: Array<{ title?: string; url: string }>;
  code?: string;
  topics?: string[];
};

const EXAMPLES: TExample[] = [
  // React examples
  {
    statement: "useRef gives access to a DOM element for imperative focus.",
    question: "What will happen when the button is clicked in the following code?",
    options: [
      "The input will be focused immediately.",
      "The input will not be focused due to a missing ref.",
      "The input will be focused after a delay.",
      "The button will throw an error.",
    ],
    correctIndex: 0,
    difficulty: "Easy",
    bloomLevel: "Understand",
    explanation: "Calling focus() on the current DOM node focuses the input immediately.",
    explanationBullets: ["Refs point to DOM nodes", "focus() runs synchronously on click"],
    citations: [{ title: "React – Refs", url: "https://react.dev/learn/referencing-values-with-refs" }],
    code: "function Example(){\n  const inputRef = useRef<HTMLInputElement>(null);\n  return (\n    <>\n      <input ref={inputRef} />\n      <button onClick={() => inputRef.current?.focus()}>Focus</button>\n    </>\n  );\n}",
    topics: ["React"],
  },
  {
    statement: "Effect cleanup prevents leaks on unmount.",
    question: "Why is the cleanup returned from useEffect important here?",
    options: [
      "It avoids multiple subscriptions when the effect re-runs.",
      "It makes the effect run only once.",
      "It batches state updates.",
      "It skips dependency checks.",
    ],
    correctIndex: 0,
    difficulty: "Medium",
    bloomLevel: "Analyze",
    explanation: "Cleanup unsubscribes on unmount/dep-change, preventing duplicate listeners.",
    explanationBullets: ["Return a function from useEffect", "Avoids memory leaks"],
    citations: [{ title: "useEffect", url: "https://react.dev/learn/synchronizing-with-effects" }],
    code: "useEffect(() => {\n  const handler = () => setCount(c => c + 1);\n  window.addEventListener('click', handler);\n  return () => window.removeEventListener('click', handler);\n}, []);",
    topics: ["React"],
  },
  // JavaScript examples
  {
    statement: "Array.prototype.map returns a new array without mutating the original.",
    question: "Which method returns a new array of the same length by transforming each element?",
    options: ["forEach", "map", "push", "splice"],
    correctIndex: 1,
    difficulty: "Easy",
    bloomLevel: "Remember",
    explanation: "map produces a new array from the results of calling a function on every element.",
    explanationBullets: ["Does not mutate the input array", "One-to-one element mapping"],
    citations: [
      {
        title: "MDN – Array.prototype.map()",
        url: "https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array/map",
      },
    ],
    code: "const arr = [1,2,3];\nconsole.log(arr.map(n => n * 2));",
    topics: ["JavaScript"],
  },
  {
    statement: "await pauses within async functions only.",
    question: "What is the output order?",
    options: ["A, B, C", "A, C, B", "B, A, C", "C, B, A"],
    correctIndex: 1,
    difficulty: "Medium",
    bloomLevel: "Apply",
    explanation: "Synchronous A logs, then the microtask after await logs B, then C after.",
    explanationBullets: ["await yields to microtask queue", "console.log order shows event loop"],
    citations: [{ title: "Event loop", url: "https://developer.mozilla.org/docs/Web/JavaScript/EventLoop" }],
    code: "console.log('A');\n(async () => {\n  await Promise.resolve();\n  console.log('B');\n})();\nconsole.log('C');",
    topics: ["JavaScript"],
  },
  // TypeScript examples
  {
    statement: "unknown is a safer alternative to any requiring type narrowing before use.",
    question: "Which TypeScript type forces you to narrow the value before calling properties or methods?",
    options: ["any", "unknown", "never", "object"],
    correctIndex: 1,
    difficulty: "Medium",
    bloomLevel: "Analyze",
    explanation: "unknown cannot be used without type assertions or narrowing; it preserves type safety.",
    explanationBullets: ["Prevents accidental misuse", "Encourages guards and assertions"],
    citations: [
      {
        title: "TypeScript Handbook – unknown",
        url: "https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#unknown",
      },
    ],
    code: "function shout(x: unknown){\n  if (typeof x === 'string') {\n    return x.toUpperCase();\n  }\n  return '';\n}",
    topics: ["TypeScript"],
  },
  // React list keys
  {
    statement: "Keys must be stable and unique across siblings.",
    question: "Which fix prevents state loss when reordering?",
    options: ["Use index as key", "Use a stable id for key", "Remove keys", "Randomize keys on render"],
    correctIndex: 1,
    difficulty: "Medium",
    bloomLevel: "Evaluate",
    explanation: "Stable ids preserve element identity across reorders.",
    explanationBullets: ["Avoid index keys", "Use record.id"],
    citations: [{ title: "Keys", url: "https://react.dev/learn/rendering-lists#keeping-list-items-in-order-with-key" }],
    code: "items.map(item => <Row key={item.id} item={item} />)",
    topics: ["React"],
  },
];

export function pickExamples(count: number, topic?: string): TExample[] {
  const n = Math.max(1, Math.min(count, EXAMPLES.length));
  const pool = topic ? EXAMPLES.filter((e) => !e.topics || e.topics.includes(topic)) : EXAMPLES;
  return pool.slice(0, Math.min(n, pool.length));
}
