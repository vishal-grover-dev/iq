import { MVP_TOPIC_LIST, TMvpSubtopic, TMvpTopic } from "@/constants/mvp-ontology.constants";

export type TExample = {
  topic: TMvpTopic;
  subtopic?: TMvpSubtopic;
  statement: string;
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
  difficulty: string;
  bloomLevel: string;
  explanation: string;
  explanationBullets: string[];
  citations: Array<{ title?: string; url: string }>;
  chainOfThought: string;
  code?: string;
};

const EXAMPLES: TExample[] = [
  // React examples
  {
    topic: "React",
    subtopic: "Hooks: useRef",
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
    chainOfThought:
      "The input ref is created once, attached to the <input>, and never reassigned. When the button fires, inputRef.current is the DOM node, so focus() runs synchronously. Nothing asynchronous blocks it, so the focus happens immediately.",
    code: "function Example(){\n  const inputRef = useRef<HTMLInputElement>(null);\n  return (\n    <>\n      <input ref={inputRef} />\n      <button onClick={() => inputRef.current?.focus()}>Focus</button>\n    </>\n  );\n}",
  },
  {
    topic: "React",
    subtopic: "Hooks: useEffect",
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
    chainOfThought:
      "The effect registers a window listener every time the component mounts. Without returning removeEventListener, re-renders or unmounts would stack duplicate handlers. The cleanup guarantees previous listeners are removed so only one remains.",
    code: "useEffect(() => {\n  const handler = () => setCount(c => c + 1);\n  window.addEventListener('click', handler);\n  return () => window.removeEventListener('click', handler);\n}, []);",
  },
  {
    topic: "React",
    subtopic: "Lists & Keys (Reconciliation)",
    statement: "Keys must be stable and unique across siblings.",
    question: "Which fix prevents state loss when reordering?",
    options: ["Use index as key", "Use a stable id for key", "Remove keys", "Randomize keys on render"],
    correctIndex: 1,
    difficulty: "Medium",
    bloomLevel: "Evaluate",
    explanation: "Stable ids preserve element identity across reorders.",
    explanationBullets: ["Avoid index keys", "Use record.id"],
    citations: [{ title: "Keys", url: "https://react.dev/learn/rendering-lists#keeping-list-items-in-order-with-key" }],
    chainOfThought:
      "React reconciliation matches children by key. Index keys change when the list order shifts, so React reuses the wrong DOM nodes and state. Using a stable id keeps the mapping consistent, so items retain their identity even as order changes.",
    code: "items.map(item => <Row key={item.id} item={item} />)",
  },
  // JavaScript examples
  {
    topic: "JavaScript",
    subtopic: "Array Prototype Methods",
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
    chainOfThought:
      "forEach returns void, push mutates the source, and splice can both remove and insert. Only map walks the array and returns a new array with the transformed values, matching the question's criteria.",
    code: "const arr = [1,2,3];\nconsole.log(arr.map(n => n * 2));",
  },
  {
    topic: "JavaScript",
    subtopic: "Async/Await & Promises",
    statement: "await pauses within async functions only.",
    question: "What is the output order?",
    options: ["A, B, C", "A, C, B", "B, A, C", "C, B, A"],
    correctIndex: 1,
    difficulty: "Medium",
    bloomLevel: "Apply",
    explanation: "Synchronous A logs, then the microtask after await logs B, then C after.",
    explanationBullets: ["await yields to microtask queue", "console.log order shows event loop"],
    citations: [{ title: "Event loop", url: "https://developer.mozilla.org/docs/Web/JavaScript/EventLoop" }],
    chainOfThought:
      "console.log('A') executes first. The async IIFE hits await Promise.resolve(), scheduling the remainder (console.log('B')) as a microtask. The synchronous body continues to log 'C' before microtasks run, so the final order is A, C, B.",
    code: "console.log('A');\n(async () => {\n  await Promise.resolve();\n  console.log('B');\n})();\nconsole.log('C');",
  },
  {
    topic: "JavaScript",
    subtopic: "Async/Await & Promises",
    statement: "Microtasks execute before macrotasks in the event loop.",
    question: "What will be logged when this code runs?",
    options: [
      "Start, End, Promise, Timeout",
      "Start, Promise, End, Timeout",
      "Start, End, Timeout, Promise",
      "Promise, Start, End, Timeout",
    ],
    correctIndex: 0,
    difficulty: "Medium",
    bloomLevel: "Apply",
    explanation: "Synchronous code runs first, then microtasks (Promise), then macrotasks (setTimeout).",
    explanationBullets: ["Synchronous code executes immediately", "Microtasks have higher priority than macrotasks"],
    citations: [{ title: "Event loop", url: "https://developer.mozilla.org/docs/Web/JavaScript/EventLoop" }],
    chainOfThought:
      "'Start' logs immediately. setTimeout queues a macrotask. Promise.then queues a microtask. 'End' logs while still in the synchronous block. After the call stack clears, the microtask logs 'Promise', then the macrotask logs 'Timeout'.",
    code: "console.log('Start');\nsetTimeout(() => console.log('Timeout'), 0);\nPromise.resolve().then(() => console.log('Promise'));\nconsole.log('End');",
  },
  {
    topic: "JavaScript",
    subtopic: "Async/Await & Promises",
    statement: "async/await creates microtasks that execute before setTimeout.",
    question: "During a code review, you notice this async function. What's the execution order?",
    options: ["A, B, C, D", "A, C, B, D", "A, B, D, C", "A, D, B, C"],
    correctIndex: 1,
    difficulty: "Hard",
    bloomLevel: "Analyze",
    explanation:
      "The async function creates a microtask for the await, which executes before the setTimeout macrotask.",
    explanationBullets: ["await creates microtasks", "Microtasks execute before macrotasks"],
    citations: [
      {
        title: "async/await",
        url: "https://developer.mozilla.org/docs/Web/JavaScript/Reference/Statements/async_function",
      },
    ],
    chainOfThought:
      "'A' logs synchronously. setTimeout schedules 'D'. The async IIFE suspends at await, queuing 'B' as a microtask. The synchronous body logs 'C'. After the stack clears, the microtask prints 'B', then the macrotask prints 'D'.",
    code: "console.log('A');\nsetTimeout(() => console.log('D'), 0);\n(async () => {\n  await Promise.resolve();\n  console.log('B');\n})();\nconsole.log('C');",
  },
  {
    topic: "JavaScript",
    subtopic: "Async/Await & Promises",
    statement: "Multiple microtasks are queued and executed in order before macrotasks.",
    question: "What's the output order when this code executes?",
    options: ["1, 2, 3, 4, 5", "1, 4, 2, 3, 5", "1, 2, 4, 3, 5", "1, 4, 5, 2, 3"],
    correctIndex: 1,
    difficulty: "Hard",
    bloomLevel: "Analyze",
    explanation: "All microtasks (2, 3) execute before any macrotasks (4, 5), maintaining their queued order.",
    explanationBullets: ["Microtasks execute in queue order", "All microtasks complete before macrotasks"],
    citations: [{ title: "Event loop", url: "https://developer.mozilla.org/docs/Web/JavaScript/EventLoop" }],
    chainOfThought:
      "'1' logs first. Two Promise callbacks queue microtasks for '2' and '3' in order. setTimeout queues macrotasks for '4' and '5'. After the synchronous work, both microtasks flush ('2', '3'), then the macrotasks run in the order scheduled ('4', '5').",
    code: "console.log('1');\nsetTimeout(() => console.log('4'), 0);\nPromise.resolve().then(() => console.log('2'));\nPromise.resolve().then(() => console.log('3'));\nsetTimeout(() => console.log('5'), 0);",
  },
  {
    topic: "JavaScript",
    subtopic: "Async/Await & Promises",
    statement: "setTimeout with 0ms still creates a macrotask that executes after microtasks.",
    question: "You're debugging timing issues. What will this code output?",
    options: ["Sync, Async, Timeout", "Sync, Timeout, Async", "Timeout, Sync, Async", "Async, Sync, Timeout"],
    correctIndex: 0,
    difficulty: "Medium",
    bloomLevel: "Apply",
    explanation: "Even setTimeout(0) creates a macrotask that waits for all microtasks to complete.",
    explanationBullets: ["setTimeout(0) is still a macrotask", "Microtasks have priority over all macrotasks"],
    citations: [{ title: "setTimeout", url: "https://developer.mozilla.org/docs/Web/API/setTimeout" }],
    chainOfThought:
      "'Sync' logs synchronously. setTimeout schedules 'Timeout'. Promise.resolve queues a microtask that logs 'Async'. After the stack clears, the microtask runs before the macrotask, so the order is Sync, Async, Timeout.",
    code: "console.log('Sync');\nsetTimeout(() => console.log('Timeout'), 0);\nPromise.resolve().then(() => console.log('Async'));",
  },
  {
    topic: "JavaScript",
    subtopic: "Async/Await & Promises",
    statement: "Event loop processes one macrotask at a time, then all queued microtasks.",
    question: "During a whiteboard session, you're asked to predict this complex timing. What's the order?",
    options: ["A, B, C, D, E", "A, C, E, B, D", "A, B, D, C, E", "A, C, B, E, D"],
    correctIndex: 1,
    difficulty: "Hard",
    bloomLevel: "Evaluate",
    explanation: "Synchronous code first, then all microtasks (C, E), then macrotasks (B, D) in order.",
    explanationBullets: ["One macrotask per event loop iteration", "All microtasks execute before next macrotask"],
    citations: [{ title: "Event loop", url: "https://developer.mozilla.org/docs/Web/JavaScript/EventLoop" }],
    chainOfThought:
      "'A' logs synchronously. setTimeout queues 'B'. Promise queues microtask 'C'. Another setTimeout queues 'D'. The second Promise queues microtask 'E'. Once the call stack clears, microtasks flush in insertion order ('C', 'E'), then the macrotasks run in the order scheduled ('B', 'D').",
    code: "console.log('A');\nsetTimeout(() => console.log('B'), 0);\nPromise.resolve().then(() => console.log('C'));\nsetTimeout(() => console.log('D'), 0);\nPromise.resolve().then(() => console.log('E'));",
  },
  // TypeScript examples
  {
    topic: "TypeScript",
    subtopic: "Type Narrowing",
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
    chainOfThought:
      "The question asks for a type that enforces narrowing. any would allow any operation, never represents no values, and object still permits property access via index signatures. unknown forces you to check the type before using it, matching the prompt.",
    code: "function shout(x: unknown){\n  if (typeof x === 'string') {\n    return x.toUpperCase();\n  }\n  return '';\n}",
  },
  // HTML example
  {
    topic: "HTML",
    subtopic: "Document Structure & Semantics",
    statement: "Semantic elements convey structure for humans and assistive tech.",
    question:
      "You are converting a marketing page to be more accessible. Which change best improves semantic structure?",
    options: [
      "Wrap sections with <div class=\"section\">",
      "Replace <div id=\"nav\"> with <nav>",
      "Use <span> for headings to style them freely",
      "Remove <main> to simplify the DOM",
    ],
    correctIndex: 1,
    difficulty: "Easy",
    bloomLevel: "Understand",
    explanation: "Using <nav> communicates navigation landmarks to assistive technologies.",
    explanationBullets: ["Landmarks aid screen reader navigation", "Semantic tags reduce reliance on role attributes"],
    citations: [
      {
        title: "MDN – Semantic HTML",
        url: "https://developer.mozilla.org/docs/Glossary/Semantics",
      },
    ],
    chainOfThought:
      "The problem is about improving semantics, not just styling. A nav landmark tells assistive tech this region handles navigation. Extra divs add no meaning, spans hide the hierarchy, and removing main removes structure. Therefore replacing the div with nav is the meaningful improvement.",
  },
  // CSS example
  {
    topic: "CSS",
    subtopic: "Flexbox Fundamentals",
    statement: "Flexbox distributes free space along a single axis.",
    question:
      "Given a horizontal toolbar that should push the last item to the right, which Flexbox property is the simplest fix?",
    options: [
      "align-items: center;",
      "justify-content: space-between;",
      "margin-left: auto; on the last item",
      "flex-wrap: wrap;",
    ],
    correctIndex: 2,
    difficulty: "Medium",
    bloomLevel: "Apply",
    explanation: "Adding margin-left: auto to the final flex item consumes remaining space, pushing it right.",
    explanationBullets: ["Auto margins absorb free space", "Flexbox respects auto margins along main axis"],
    citations: [
      {
        title: "MDN – Flexbox alignment",
        url: "https://developer.mozilla.org/docs/Web/CSS/CSS_flexible_box_layout/Aligning_items_in_a_flex_container",
      },
    ],
    chainOfThought:
      "We need the last item to occupy remaining main-axis space. space-between spreads all children, not just the last. align-items targets cross-axis, and flex-wrap changes wrapping. margin-left: auto tells the final item to absorb leftover space, pushing it to the end.",
    code: ".toolbar {\n  display: flex;\n  gap: 0.75rem;\n}\n.toolbar button:last-child {\n  margin-left: auto;\n}",
  },
  // State Management example
  {
    topic: "State Management",
    subtopic: "React Context API",
    statement: "Context removes the need to pass props through every level.",
    question:
      "A settings sidebar needs access to theme state without prop drilling through six intermediate components. What is the most appropriate solution?",
    options: [
      "Duplicate the state inside the sidebar",
      "Use React Context to provide the state near the root",
      "Store the theme in a module-level variable",
      "Convert every component in between to accept the props",
    ],
    correctIndex: 1,
    difficulty: "Medium",
    bloomLevel: "Analyze",
    explanation: "Providing a context allows deeply nested consumers to read shared state without prop drilling.",
    explanationBullets: ["Context shares data with distant descendants", "Avoids out-of-sync duplicates"],
    citations: [
      {
        title: "React – Context",
        url: "https://react.dev/learn/passing-data-deeply-with-context",
      },
    ],
    chainOfThought:
      "Duplicating state risks divergence, module globals break React's render model, and touching six components adds maintenance overhead. Wrapping the tree in a context provider exposes the theme directly to the sidebar without prop drilling, solving the stated constraint.",
  },
  // Accessibility example
  {
    topic: "Accessibility",
    subtopic: "Focus Management & Keyboard Navigation",
    statement: "Interactive components must remain keyboard accessible.",
    question:
      "A custom modal traps focus but the close button is only clickable with a mouse. What's the minimal change to restore accessibility?",
    options: [
      "Set tabindex=\"-1\" on the close button",
      "Replace the <div> with a <button> element",
      "Remove the focus trap entirely",
      "Add role=\"presentation\" to the close control",
    ],
    correctIndex: 1,
    difficulty: "Medium",
    bloomLevel: "Evaluate",
    explanation: "Using a semantic <button> offers built-in keyboard support and focus behavior.",
    explanationBullets: ["Buttons are focusable by default", "Space/Enter activation comes for free"],
    citations: [
      {
        title: "WAI-ARIA Authoring Practices – Dialog",
        url: "https://www.w3.org/WAI/ARIA/apg/patterns/dialog/",
      },
    ],
    chainOfThought:
      "tabindex=-1 removes focusability, and role=presentation hides semantics. The issue is the control isn't keyboard-activatable, so the fix is to use a button element. The focus trap stays, and the native button handles keyboard interactions automatically.",
  },
  // Testing example
  {
    topic: "Testing",
    subtopic: "Async Testing Patterns",
    statement: "React Testing Library encourages assertions that await UI updates.",
    question:
      "When testing a component that fetches data on mount, which RTL helper waits for the element to appear before asserting?",
    options: [
      "screen.getByText",
      "screen.findByText",
      "screen.queryByText",
      "screen.debug",
    ],
    correctIndex: 1,
    difficulty: "Medium",
    bloomLevel: "Apply",
    explanation: "findBy* queries return a promise that resolves when the element appears, ideal for async UI.",
    explanationBullets: ["findBy* waits up to the default timeout", "Avoids manual waitFor for common cases"],
    citations: [
      {
        title: "Testing Library – Queries",
        url: "https://testing-library.com/docs/queries/about/",
      },
    ],
    chainOfThought:
      "getBy* throws immediately if the element is missing, while queryBy* returns null. Only findBy* provides an awaited promise that resolves after the async fetch completes, matching the need to wait before asserting.",
    code: "const result = await screen.findByText(/loaded/i);\nexpect(result).toBeInTheDocument();",
  },
];

const EXAMPLES_BY_TOPIC = EXAMPLES.reduce<Record<TMvpTopic, TExample[]>>((acc, example) => {
  if (!acc[example.topic]) {
    acc[example.topic] = [];
  }
  acc[example.topic].push(example);
  return acc;
}, {} as Record<TMvpTopic, TExample[]>);

const missingTopics = MVP_TOPIC_LIST.filter((topic) => !EXAMPLES_BY_TOPIC[topic]?.length);

if (missingTopics.length > 0) {
  throw new Error(
    `[mcq-examples] Missing examples for topics: ${missingTopics.join(", ")}. Update data/mcq-examples.ts to cover the MVP ontology.`
  );
}

export function pickExamples(count: number, topic?: string): TExample[] {
  const normalizedTopic = topic as TMvpTopic | undefined;
  const pool = normalizedTopic ? EXAMPLES_BY_TOPIC[normalizedTopic] ?? [] : EXAMPLES;
  const limit = Math.max(1, Math.min(count, pool.length || EXAMPLES.length));

  if (pool.length === 0) {
    return EXAMPLES.slice(0, limit);
  }

  return pool.slice(0, limit);
}

export function getChainOfThoughtExample(topic: TMvpTopic): TExample {
  const pool = EXAMPLES_BY_TOPIC[topic];
  if (!pool || pool.length === 0) {
    throw new Error(`[mcq-examples] No chain-of-thought example available for topic: ${topic}`);
  }
  return pool[0];
}
