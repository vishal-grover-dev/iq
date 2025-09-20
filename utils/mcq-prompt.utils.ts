import type {
  EBloomLevel,
  EDifficulty,
  TGeneratorBuildArgs,
  TJudgeBuildArgs,
  TNeighborMcq,
  TReviserBuildArgs,
} from "@/types/mcq.types";
import { EPromptMode } from "@/types/mcq.types";

/**
 * Curated, software-engineering focused examples for MCQ generation covering fundamentals,
 * algorithms, databases, networking, OS, software design, testing, security, and version control.
 * Each includes explanation, 2–3 bullets, and citations.
 */
const EXAMPLES: Array<{
  statement: string;
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
  difficulty: EDifficulty;
  bloomLevel: EBloomLevel;
  explanation: string;
  explanationBullets: string[];
  citations: Array<{ title?: string; url: string }>;
  code?: string;
}> = [
  {
    statement: "Stable sorting preserves the relative order of equal keys.",
    question: "Which of the following is a stable sorting algorithm by default?",
    options: ["Quick sort", "Merge sort", "Heap sort", "Selection sort"],
    correctIndex: 1,
    difficulty: "Medium" as EDifficulty,
    bloomLevel: "Understand" as EBloomLevel,
    explanation: "Merge sort is stable; it never reorders equal elements across sublists.",
    explanationBullets: ["Stability matters with multi-key sorts", "Quick/Heap are not stable by default"],
    citations: [
      { title: "CLRS – Sorting", url: "https://mitpress.mit.edu/9780262046305/" },
      { title: "Wikipedia – Sorting algorithm", url: "https://en.wikipedia.org/wiki/Sorting_algorithm" },
    ],
  },
  {
    statement: "Normalization reduces redundancy and anomalies.",
    question: "Which normal form removes partial dependency on a composite key?",
    options: ["1NF", "2NF", "3NF", "BCNF"],
    correctIndex: 1,
    difficulty: "Medium" as EDifficulty,
    bloomLevel: "Analyze" as EBloomLevel,
    explanation: "2NF ensures every non-key attribute depends on the whole key, not part of it.",
    explanationBullets: ["Applicable only when the primary key is composite", "Precedes 3NF"],
    citations: [
      { title: "Database System Concepts", url: "https://www.db-book.com/" },
      { title: "Normalization", url: "https://en.wikipedia.org/wiki/Database_normalization" },
    ],
  },
  {
    statement: "ACID defines reliable transactions.",
    question: "Which isolation level prevents dirty reads but allows non-repeatable reads?",
    options: ["Read Uncommitted", "Read Committed", "Repeatable Read", "Serializable"],
    correctIndex: 1,
    difficulty: "Hard" as EDifficulty,
    bloomLevel: "Evaluate" as EBloomLevel,
    explanation: "Read Committed only sees committed data, but repeated reads can observe changes.",
    explanationBullets: ["Dirty reads blocked", "Non-repeatable reads possible"],
    citations: [
      { title: "PostgreSQL – Isolation", url: "https://www.postgresql.org/docs/current/transaction-iso.html" },
    ],
  },
  {
    statement: "TCP provides ordered, reliable delivery; UDP does not.",
    question: "Which is guaranteed by TCP but not by UDP?",
    options: ["Checksum", "Port addressing", "Ordered delivery", "Broadcast"],
    correctIndex: 2,
    difficulty: "Easy" as EDifficulty,
    bloomLevel: "Remember" as EBloomLevel,
    explanation: "TCP uses sequence numbers and ACKs to ensure in-order delivery.",
    explanationBullets: ["Retransmission on loss", "Flow and congestion control"],
    citations: [{ title: "RFC 793 – TCP", url: "https://www.rfc-editor.org/rfc/rfc793" }],
  },

  {
    statement: "Threads share address space; processes do not by default.",
    question: "Which is true regarding threads vs processes?",
    options: [
      "Threads have separate memory",
      "Threads are lighter-weight",
      "Processes share stack",
      "Processes cannot parallelize",
    ],
    correctIndex: 1,
    difficulty: "Medium" as EDifficulty,
    bloomLevel: "Understand" as EBloomLevel,
    explanation: "Threads share memory and resources, lowering context-switch cost.",
    explanationBullets: ["Cheaper IPC", "Weaker isolation"],
    citations: [{ title: "OS Concepts", url: "https://www.os-book.com/OS10/" }],
  },

  {
    statement: "OCP: open for extension, closed for modification.",
    question: "What does OCP recommend for evolving behavior?",
    options: ["Edit existing classes", "Use composition/abstraction to extend", "Duplicate code paths", "Global flags"],
    correctIndex: 1,
    difficulty: "Medium" as EDifficulty,
    bloomLevel: "Understand" as EBloomLevel,
    explanation: "Extend via new modules implementing interfaces to avoid altering tested code.",
    explanationBullets: ["Plug-in style", "Lower regression risk"],
    citations: [{ title: "SOLID Principles", url: "https://en.wikipedia.org/wiki/SOLID" }],
  },
  {
    statement: "Unit tests isolate the smallest testable parts.",
    question: "A good unit test typically:",
    options: ["Requires live DB", "Mocks collaborators", "Spans microservices", "Is flaky by timing"],
    correctIndex: 1,
    difficulty: "Easy" as EDifficulty,
    bloomLevel: "Understand" as EBloomLevel,
    explanation: "Unit tests avoid external I/O by mocking dependencies for determinism.",
    explanationBullets: ["Fast feedback", "Precise failure localization"],
    citations: [{ title: "xUnit Patterns", url: "http://xunitpatterns.com/" }],
  },
  {
    statement: "Parameterized queries prevent SQL injection.",
    question: "Which practice best mitigates SQL injection?",
    options: ["Input length limits", "Parameterized queries", "Client-side checks", "Escaping only"],
    correctIndex: 1,
    difficulty: "Medium" as EDifficulty,
    bloomLevel: "Apply" as EBloomLevel,
    explanation: "Prepared statements separate code from data, blocking injection vectors.",
    explanationBullets: ["Avoid string concatenation", "Validate and encode where appropriate"],
    citations: [{ title: "OWASP – SQL Injection", url: "https://owasp.org/www-community/attacks/SQL_Injection" }],
  },
  {
    statement: "CSRF tokens defend against cross-site request forgery.",
    question: "An anti-CSRF token primarily mitigates:",
    options: ["Reflected XSS", "Stored XSS", "CSRF", "Clickjacking"],
    correctIndex: 2,
    difficulty: "Medium" as EDifficulty,
    bloomLevel: "Analyze" as EBloomLevel,
    explanation: "Token proves same-origin user intent, thwarting forged cross-site requests.",
    explanationBullets: ["Unpredictable secret bound to session", "Pair with SameSite cookies"],
    citations: [{ title: "OWASP – CSRF", url: "https://owasp.org/www-community/attacks/csrf" }],
  },
  {
    statement: "Rebase creates linear history; merge preserves branch topology.",
    question: "Why rebase a local feature branch before pushing?",
    options: ["Keep merge commits", "Create linear history", "Avoid conflicts forever", "Publish partial work"],
    correctIndex: 1,
    difficulty: "Medium" as EDifficulty,
    bloomLevel: "Evaluate" as EBloomLevel,
    explanation: "Rebase incorporates upstream, making a clean, linear series of commits.",
    explanationBullets: ["Do before sharing", "Avoid on shared branches"],
    citations: [{ title: "Pro Git – Rebasing", url: "https://git-scm.com/book/en/v2/Git-Branching-Rebasing" }],
  },
  // HTML
  {
    statement: "Semantic HTML elements convey meaning and built-in accessibility.",
    question: "Which element is most appropriate for a clickable action with default keyboard support?",
    options: ["div", "span", "button", "a without href"],
    correctIndex: 2,
    difficulty: "Easy" as EDifficulty,
    bloomLevel: "Understand" as EBloomLevel,
    explanation: "button has inherent semantics, focusability, and Enter/Space activation behavior.",
    explanationBullets: ["Accessible by default without ARIA", "Consistent keyboard interaction handling"],
    citations: [{ title: "MDN – <button> element", url: "https://developer.mozilla.org/docs/Web/HTML/Element/button" }],
  },
  {
    statement: "Flexbox lays out items along a main and cross axis.",
    question: "Which property controls space distribution along the flex container's main axis?",
    options: ["align-items", "justify-content", "flex-basis", "place-content"],
    correctIndex: 1,
    difficulty: "Medium" as EDifficulty,
    bloomLevel: "Apply" as EBloomLevel,
    explanation: "justify-content aligns and distributes free space along the main axis.",
    explanationBullets: ["Values like center, space-between, space-around", "Depends on flex-direction"],
    citations: [{ title: "MDN – justify-content", url: "https://developer.mozilla.org/docs/Web/CSS/justify-content" }],
  },
  {
    statement: "Array.prototype.map returns a new array without mutating the original.",
    question: "Which method returns a new array of the same length by transforming each element?",
    options: ["forEach", "map", "push", "splice"],
    correctIndex: 1,
    difficulty: "Easy" as EDifficulty,
    bloomLevel: "Remember" as EBloomLevel,
    explanation: "map produces a new array from the results of calling a function on every element.",
    explanationBullets: ["Does not mutate the input array", "One-to-one element mapping"],
    citations: [
      {
        title: "MDN – Array.prototype.map()",
        url: "https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array/map",
      },
    ],
  },
  {
    statement: "unknown is a safer alternative to any requiring type narrowing before use.",
    question: "Which TypeScript type forces you to narrow the value before calling properties or methods?",
    options: ["any", "unknown", "never", "object"],
    correctIndex: 1,
    difficulty: "Medium" as EDifficulty,
    bloomLevel: "Analyze" as EBloomLevel,
    explanation: "unknown cannot be used without type assertions or narrowing; it preserves type safety.",
    explanationBullets: ["Prevents accidental misuse", "Encourages guards and assertions"],
    citations: [
      {
        title: "TypeScript Handbook – unknown",
        url: "https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#unknown",
      },
    ],
  },
  {
    statement: "Keys help React identify items in a list across renders.",
    question: "What is the primary purpose of keys when rendering lists in React?",
    options: [
      "Improve CSS specificity",
      "Trigger re-renders on click",
      "Help React preserve element identity",
      "Enable server-side rendering",
    ],
    correctIndex: 2,
    difficulty: "Medium" as EDifficulty,
    bloomLevel: "Understand" as EBloomLevel,
    explanation: "Keys let React track items between updates, minimizing re-mounts and preserving state.",
    explanationBullets: ["Use stable IDs, not array indices", "Affects reconciliation performance and correctness"],
    citations: [
      {
        title: "React Docs – Rendering Lists",
        url: "https://react.dev/learn/rendering-lists#keeping-list-items-in-order-with-key",
      },
    ],
  },
  // Coding examples (added to ensure ≥40% coverage)
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
    difficulty: "Easy" as EDifficulty,
    bloomLevel: "Understand" as EBloomLevel,
    explanation: "Calling focus() on the current DOM node focuses the input immediately.",
    explanationBullets: ["Refs point to DOM nodes", "focus() runs synchronously on click"],
    citations: [{ title: "React – Refs", url: "https://react.dev/learn/referencing-values-with-refs" }],
    code: "function Example(){\n  const inputRef = useRef<HTMLInputElement>(null);\n  return (\n    <>\n      <input ref={inputRef} />\n      <button onClick={() => inputRef.current?.focus()}>Focus</button>\n    </>\n  );\n}",
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
    difficulty: "Medium" as EDifficulty,
    bloomLevel: "Analyze" as EBloomLevel,
    explanation: "Cleanup unsubscribes on unmount/dep-change, preventing duplicate listeners.",
    explanationBullets: ["Return a function from useEffect", "Avoids memory leaks"],
    citations: [{ title: "useEffect", url: "https://react.dev/learn/synchronizing-with-effects" }],
    code: "useEffect(() => {\n  const handler = () => setCount(c => c + 1);\n  window.addEventListener('click', handler);\n  return () => window.removeEventListener('click', handler);\n}, []);",
  },
  {
    statement: "Array.map returns a new array without mutation.",
    question: "What does the following code log?",
    options: ["[2,4,6]", "[1,2,3]", "[1,2,3,2,4,6]", "Throws an error"],
    correctIndex: 0,
    difficulty: "Easy" as EDifficulty,
    bloomLevel: "Remember" as EBloomLevel,
    explanation: "map multiplies each element by two, producing a new array.",
    explanationBullets: ["map is non-mutating", "length preserved"],
    citations: [
      {
        title: "Array.prototype.map",
        url: "https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array/map",
      },
    ],
    code: "const arr = [1,2,3];\nconsole.log(arr.map(n => n * 2));",
  },
  {
    statement: "await pauses within async functions only.",
    question: "What is the output order?",
    options: ["A, B, C", "A, C, B", "B, A, C", "C, B, A"],
    correctIndex: 1,
    difficulty: "Medium" as EDifficulty,
    bloomLevel: "Apply" as EBloomLevel,
    explanation: "Synchronous A logs, then the microtask after await logs B, then C after.",
    explanationBullets: ["await yields to microtask queue", "console.log order shows event loop"],
    citations: [{ title: "Event loop", url: "https://developer.mozilla.org/docs/Web/JavaScript/EventLoop" }],
    code: "console.log('A');\n(async () => {\n  await Promise.resolve();\n  console.log('B');\n})();\nconsole.log('C');",
  },
  {
    statement: "let captures loop variable per iteration; var does not.",
    question: "What is logged when each button is clicked?",
    options: [
      "All log the last index.",
      "Each logs its own index (0,1,2).",
      "Only the first logs; others error.",
      "Random due to closures.",
    ],
    correctIndex: 1,
    difficulty: "Medium" as EDifficulty,
    bloomLevel: "Analyze" as EBloomLevel,
    explanation: "let creates a new binding per iteration so closures capture distinct values.",
    explanationBullets: ["var shares a single binding", "Block scoping fixes the bug"],
    citations: [{ title: "let", url: "https://developer.mozilla.org/docs/Web/JavaScript/Reference/Statements/let" }],
    code: "for (let i = 0; i < 3; i++) {\n  setTimeout(() => console.log(i), 0);\n}",
  },
  {
    statement: "Narrowing is required before using unknown.",
    question: "Why does the following snippet error until narrowed?",
    options: [
      "unknown has no members until narrowed.",
      "unknown is the same as any.",
      "unknown auto-casts to string.",
      "unknown disables type checking.",
    ],
    correctIndex: 0,
    difficulty: "Medium" as EDifficulty,
    bloomLevel: "Analyze" as EBloomLevel,
    explanation: "Accessing .toUpperCase requires asserting or narrowing to string first.",
    explanationBullets: ["Use typeof checks", "Keeps type safety"],
    citations: [
      {
        title: "TypeScript unknown",
        url: "https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#unknown",
      },
    ],
    code: "function shout(x: unknown){\n  if (typeof x === 'string') {\n    return x.toUpperCase();\n  }\n  return '';\n}",
  },
  {
    statement: "Keys must be stable and unique across siblings.",
    question: "Which fix prevents state loss when reordering?",
    options: ["Use index as key", "Use a stable id for key", "Remove keys", "Randomize keys on render"],
    correctIndex: 1,
    difficulty: "Medium" as EDifficulty,
    bloomLevel: "Evaluate" as EBloomLevel,
    explanation: "Stable ids preserve element identity across reorders.",
    explanationBullets: ["Avoid index keys", "Use record.id"],
    citations: [{ title: "Keys", url: "https://react.dev/learn/rendering-lists#keeping-list-items-in-order-with-key" }],
    code: "items.map(item => <Row key={item.id} item={item} />)",
  },
];

function pickExamples(k: number): typeof EXAMPLES {
  const n = Math.max(1, Math.min(k, EXAMPLES.length));
  return EXAMPLES.slice(0, n);
}

export function buildGeneratorMessages(args: TGeneratorBuildArgs): { system: string; user: string } {
  const mode = args.mode ?? EPromptMode.FEW_SHOT;
  const examples = pickExamples(args.examplesCount ?? 10);
  const system = [
    "You generate high-quality multiple-choice questions (MCQs) with citations.",
    "Rules:",
    "- Always return STRICT JSON with fields: topic, subtopic, version, difficulty, bloomLevel, question, options (array of 4 strings), correctIndex (0-3), explanation (string), explanationBullets (array of 2-3 strings), citations (array of {title?, url}).",
    "- Use exactly four plausible options and exactly one correct answer.",
    "- Ground content in the provided context and cite 1–2 most relevant sources.",
    args.codingMode
      ? "- Coding mode is ON: Questions MUST include a short fenced code block (```js``` or ```tsx```) of 3-8 lines. Ask about the code's behavior, potential bugs, or correct fixes. Code blocks are REQUIRED."
      : undefined,
    mode === EPromptMode.CHAIN_OF_THOUGHT
      ? "- Think step by step internally, but output ONLY the final JSON response."
      : "- Follow the patterns from the examples; output ONLY the final JSON response.",
  ]
    .filter(Boolean)
    .join("\n");

  const labels = [
    `Topic: ${args.topic}`,
    args.subtopic ? `Subtopic: ${args.subtopic}` : undefined,
    args.version ? `Version: ${args.version}` : undefined,
    args.difficulty ? `Difficulty: ${args.difficulty}` : undefined,
    args.bloomLevel ? `Bloom: ${args.bloomLevel}` : undefined,
  ]
    .filter(Boolean)
    .join(" | ");

  const contextLines = args.contextItems
    .slice(0, 8)
    .map((c, i) => `${i + 1}. ${c.title ? `${c.title} — ` : ""}${c.url}\n${c.content.slice(0, 700)}`)
    .join("\n\n");

  const examplesBlock = examples
    .map((ex, i) => {
      const bullets = ex.explanationBullets.map((b) => `- ${b}`).join("\n");
      const cits = ex.citations.map((c) => `- ${c.title ? `${c.title} — ` : ""}${c.url}`).join("\n");
      return [
        `Example ${i + 1}`,
        `Statement: ${ex.statement}`,
        `Question: ${ex.question}`,
        `Options: ${ex.options.join(", ")}`,
        `CorrectIndex: ${ex.correctIndex}`,
        `Difficulty: ${ex.difficulty}`,
        `Bloom: ${ex.bloomLevel}`,
        ex.code ? `Code:\n\n\`\`\`tsx\n${ex.code}\n\`\`\`` : undefined,
        `Explanation: ${ex.explanation}`,
        `Explanation Bullets:\n${bullets}`,
        `Citations:\n${cits}`,
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");

  const negativeBlock = (() => {
    const list = (args.negativeExamples ?? []).filter((s) => typeof s === "string" && s.trim().length > 0).slice(0, 8);
    if (list.length === 0) return undefined;
    return [
      "Avoid generating MCQs similar to the following question gists:",
      ...list.map((q, i) => `${i + 1}. ${q.slice(0, 240)}`),
      "Do not copy these. Aim for different angles or scenarios.",
    ].join("\n");
  })();

  const user = [
    `Labels: ${labels}`,
    "Context (use for grounding and citations):",
    contextLines,
    mode === EPromptMode.FEW_SHOT ? "Examples (style reference):\n" + examplesBlock : undefined,
    negativeBlock,
    args.codingMode
      ? "Task: Generate ONE coding MCQ. MUST include a short fenced code block (```js``` or ```tsx```) in the question. Ask about the code's behavior, bugs, or fixes. The code block should be 3-8 lines and relevant to the topic."
      : "Task: Generate one MCQ adhering to labels and grounded in the context.",
    'Return JSON only with keys: {"topic","subtopic","version","difficulty","bloomLevel","question","options","correctIndex","explanation","explanationBullets","citations"}',
  ]
    .filter(Boolean)
    .join("\n\n");

  return { system, user };
}

export function buildReviserMessages(args: TReviserBuildArgs): {
  system: string;
  user: string;
} {
  const contextLines = args.contextItems
    .slice(0, 6)
    .map((c, i) => `${i + 1}. ${c.title ? `${c.title} — ` : ""}${c.url}\n${c.content.slice(0, 500)}`)
    .join("\n\n");

  const system = [
    "You are an expert MCQ reviser. Your task is to modify an existing multiple-choice question based on user instructions.",
    "Rules:",
    "- Always return STRICT JSON with fields: topic, subtopic, version, difficulty, bloomLevel, question, options (array of 4 strings), correctIndex (0-3), explanation (string), explanationBullets (array of 2-3 strings), citations (array of {title?, url}).",
    "- Keep the same topic, subtopic, and version as the original question.",
    "- Make minimal but effective changes based on the instruction.",
    "- Maintain high quality: ensure exactly four plausible options and one correct answer.",
    "- Preserve citations when possible, update them if the content changes significantly.",
    "- Use the provided context to ensure accuracy and add relevant citations.",
  ].join("\n");

  const user = [
    `Current MCQ to revise:`,
    `Topic: ${args.currentMcq.topic}`,
    `Subtopic: ${args.currentMcq.subtopic}`,
    `Version: ${args.currentMcq.version || "N/A"}`,
    `Difficulty: ${args.currentMcq.difficulty}`,
    `Bloom Level: ${args.currentMcq.bloomLevel}`,
    `Question: ${args.currentMcq.question}`,
    `Options: ${args.currentMcq.options.map((opt, i) => `${String.fromCharCode(65 + i)}. ${opt}`).join(", ")}`,
    `Correct Answer: ${String.fromCharCode(65 + args.currentMcq.correctIndex)}`,
    `Explanation: ${args.currentMcq.explanation || "N/A"}`,
    `Explanation Bullets: ${args.currentMcq.explanationBullets?.join(", ") || "N/A"}`,
    `Citations: ${args.currentMcq.citations.map((c) => (c.title ? `${c.title} — ${c.url}` : c.url)).join(", ")}`,
    "",
    `User Instruction: "${args.instruction}"`,
    "",
    "Context for grounding:",
    contextLines,
    "",
    "Task: Revise the MCQ according to the user instruction. Return the updated JSON only.",
  ].join("\n");

  return { system, user };
}

export function buildJudgeMessages(args: TJudgeBuildArgs & { neighbors?: TNeighborMcq[] }): {
  system: string;
  user: string;
} {
  const system = [
    "You are an MCQ quality judge. Evaluate clarity, correctness, option plausibility, single correct answer, appropriate difficulty and Bloom level, presence of citations grounded in context, and DUPLICATE RISK.",
    "Duplicate risk: If the MCQ is semantically similar to any provided neighbor items, mark verdict = 'revise' and explain.",
    args.codingMode
      ? "Coding mode is ON: Prefer MCQs with a concise fenced code block. If none is present, or if the options do not reflect the code's behavior, mark 'revise' with reasons."
      : undefined,
    "Return STRICT JSON: { verdict: 'approve' | 'revise', reasons: string[], suggestions?: string[] }",
  ]
    .filter(Boolean)
    .join("\n");

  const ctx = args.contextItems
    .slice(0, 6)
    .map((c, i) => `${i + 1}. ${c.title ? `${c.title} — ` : ""}${c.url}\n${c.content.slice(0, 500)}`)
    .join("\n\n");

  const neighborsBlock = (args.neighbors ?? [])
    .slice(0, 6)
    .map((n, i) => {
      const opts = n.options.map((o, j) => `${String.fromCharCode(65 + j)}. ${o}`).join(" | ");
      return `${i + 1}. ${n.question.slice(0, 240)}\nOptions: ${opts}`;
    })
    .join("\n\n");

  const mcq = args.mcq;
  const mcqJson = JSON.stringify(mcq, null, 2);

  const parts = ["Context:", ctx, "MCQ to evaluate (JSON):", mcqJson];
  if (neighborsBlock) {
    parts.push("Similar existing items (avoid duplicates):", neighborsBlock);
  }
  parts.push("Assess and return only JSON as specified.");

  const user = parts.join("\n\n");

  return { system, user };
}
