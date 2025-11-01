import { MVP_TOPIC_LIST, TMvpSubtopic, TMvpTopic, TOPICS, SUBTOPICS } from "@/constants/mcq.constants";

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
    topic: TOPICS.REACT,
    subtopic: SUBTOPICS.React.HooksUseRef,
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
    topic: TOPICS.REACT,
    subtopic: SUBTOPICS.React.HooksUseEffect,
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
    topic: TOPICS.REACT,
    subtopic: SUBTOPICS.React.ListsKeysReconciliation,
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
  {
    topic: TOPICS.REACT,
    subtopic: SUBTOPICS.React.ComponentsProps,
    statement: "Props are read-only data that should be rendered directly rather than copied into local state.",
    question:
      "A dashboard passes a `user` object to `ProfileCard`. After an async refresh updates the parent state, the card still shows the old title. Which refactor keeps the card aligned with the newest props?",
    options: [
      "Read `user.title` directly in the JSX instead of storing it with useState.",
      "Mutate `user.title` inside ProfileCard before rendering the element.",
      "Wrap ProfileCard in React.memo so it skips re-rendering.",
      "Call setState inside ProfileCard on every render to sync the prop value.",
    ],
    correctIndex: 0,
    difficulty: "Medium",
    bloomLevel: "Apply",
    explanation:
      "Derived state from props goes stale. Rendering `user.title` directly ensures the UI reflects parent state updates.",
    explanationBullets: [
      "Props flow one way and should not be mutated",
      "Avoid duplicating props in local state unless you control syncing",
    ],
    citations: [
      {
        title: "React – Passing Props to a Component",
        url: "https://react.dev/learn/passing-props-to-a-component",
      },
    ],
    chainOfThought:
      "`ProfileCard` initializes local state from `user.title`, so it freezes that value from the first render. When the parent fetch completes, React re-renders with a new `user`, but the child state never updates. Removing the extra state and reading `user.title` keeps the view tied to the canonical data, so the new title appears immediately.",
    code: 'function Dashboard() {\n  const [user, setUser] = useState({ name: "Ada", title: "Engineer" });\n\n  useEffect(() => {\n    const timer = setTimeout(() => {\n      setUser((prev) => ({ ...prev, title: "Lead Engineer" }));\n    }, 1000);\n    return () => clearTimeout(timer);\n  }, []);\n\n  return <ProfileCard user={user} />;\n}\n\nfunction ProfileCard({ user }: { user: { name: string; title: string } }) {\n  return (\n    <section>\n      <h2>{user.name}</h2>\n      <p>{user.title}</p>\n    </section>\n  );\n}',
  },
  {
    topic: TOPICS.REACT,
    subtopic: SUBTOPICS.React.HooksUseState,
    statement: "useState updates are batched and each setter call receives the state value from when it was scheduled.",
    question:
      "A counter calls `setCount(count + 1)` twice inside the same click handler but only increments by 1. What change ensures the button adds 2 each click?",
    options: [
      "Use the functional updater form: `setCount((c) => c + 1)` for each increment.",
      "Wrap the handler with useMemo so React reuses the old closure.",
      "Disable automatic batching by wrapping the calls in flushSync.",
      "Store the count in a ref and assign to it directly.",
    ],
    correctIndex: 0,
    difficulty: "Medium",
    bloomLevel: "Analyze",
    explanation:
      "Each `setCount(count + 1)` captures the same stale value. The functional updater reads the latest state for every call, so two updates apply.",
    explanationBullets: [
      "State setters are asynchronous and may batch",
      "Functional updates guarantee you work with the latest value",
    ],
    citations: [{ title: "React – Updating State", url: "https://react.dev/learn/updating-objects-in-state" }],
    chainOfThought:
      "`count` inside the handler refers to the value from when the component rendered. Two calls to `setCount(count + 1)` schedule updates with the identical payload, so React applies the same +1 once. Using `setCount((c) => c + 1)` asks React to compute the next value from the latest state, so both increments run sequentially and the visible count rises by 2.",
    code: "function Counter() {\n  const [count, setCount] = useState(0);\n  const incrementTwice = () => {\n    setCount((c) => c + 1);\n    setCount((c) => c + 1);\n  };\n  return (\n    <button onClick={incrementTwice}>Count: {count}</button>\n  );\n}",
  },
  {
    topic: TOPICS.REACT,
    subtopic: SUBTOPICS.React.HooksUseMemoUseCallback,
    statement: "useMemo caches expensive derived data until its dependencies change.",
    question:
      "A product grid filters thousands of items on every keystroke, causing jank. Which refactor ensures the expensive filter only recomputes when `products` or `query` change?",
    options: [
      "Wrap the filter logic in useMemo with `[products, query]` as dependencies.",
      "Move the filter into a useEffect without a dependency array.",
      "Store the filtered list in a ref and mutate it inside the handler.",
      "Trigger the filter inside setTimeout so it runs later on the event loop.",
    ],
    correctIndex: 0,
    difficulty: "Medium",
    bloomLevel: "Apply",
    explanation:
      "useMemo memoizes the computed list and recomputes only when the dependencies change, avoiding repeated expensive work on unrelated renders.",
    explanationBullets: ["useMemo caches derived values", "Dependency arrays control when recalculation happens"],
    citations: [
      {
        title: "React – Memoizing Computations",
        url: "https://react.dev/learn/you-might-not-need-an-effect#cache-expensive-calculations",
      },
    ],
    chainOfThought:
      "The component re-renders on every key press, so the filter runs each time and blocks the main thread. Wrapping the filter in `useMemo` with `[products, query]` means React reuses the previous result unless those inputs change. That keeps the UI responsive while preserving correctness for new queries.",
    code: 'function ProductGrid({ products }: { products: Product[] }) {\n  const [query, setQuery] = useState("");\n  const filtered = useMemo(() => {\n    const lower = query.toLowerCase();\n    return products.filter((p) => p.name.toLowerCase().includes(lower));\n  }, [products, query]);\n\n  return (\n    <>\n      <input value={query} onChange={(e) => setQuery(e.target.value)} />\n      <List items={filtered} />\n    </>\n  );\n}',
  },
  {
    topic: TOPICS.REACT,
    subtopic: SUBTOPICS.React.CustomHooks,
    statement: "Custom hooks encapsulate reusable stateful logic without rendering anything by themselves.",
    question:
      "Two components need to persist a form draft to localStorage and restore it on mount. What's the idiomatic React solution to avoid duplicating the effect logic?",
    options: [
      "Extract the persistence behavior into a custom hook like `usePersistentState` and call it in both components.",
      "Create a base class with the effect and extend it in each component.",
      "Wrap the components in a higher-order component that mutates localStorage directly.",
      "Share the logic by copying the effect and renaming variables in each file.",
    ],
    correctIndex: 0,
    difficulty: "Medium",
    bloomLevel: "Analyze",
    explanation: "Custom hooks let you share the same effect and state wiring while keeping components simple.",
    explanationBullets: ["Hooks can call other hooks", "Custom hooks return state or helpers without rendering"],
    citations: [
      {
        title: "React – Reusing Logic with Custom Hooks",
        url: "https://react.dev/learn/reusing-logic-with-custom-hooks",
      },
    ],
    chainOfThought:
      "Repeating the `useEffect` and `useState` blocks in multiple components risks divergence. A custom hook can manage reading from localStorage, seeding state, and syncing changes. Both components call the hook, so the logic lives in one place and stays consistent while components focus on rendering.",
    code: "function usePersistentState<T>(key: string, initial: T) {\n  const [value, setValue] = useState(() => {\n    const raw = window.localStorage.getItem(key);\n    return raw ? (JSON.parse(raw) as T) : initial;\n  });\n\n  useEffect(() => {\n    window.localStorage.setItem(key, JSON.stringify(value));\n  }, [key, value]);\n\n  return [value, setValue] as const;\n}",
  },
  {
    topic: TOPICS.REACT,
    subtopic: SUBTOPICS.React.PerformanceOptimization,
    statement: "Memoizing child components prevents avoidable re-renders when their props are stable.",
    question:
      "A parent component updates a search query and causes every `UserRow` to re-render even when the row's props haven't changed. Which optimization avoids the extra renders without breaking updates when a row actually changes?",
    options: [
      "Wrap `UserRow` with `React.memo` and ensure the row props remain referentially stable.",
      "Store each row's JSX in a ref and reuse it on every render.",
      "Move the list into context so children subscribe manually.",
      "Force-update the parent only when the table scrolls.",
    ],
    correctIndex: 0,
    difficulty: "Medium",
    bloomLevel: "Evaluate",
    explanation:
      "React.memo compares previous and next props. When they match, React skips rendering the child, cutting down wasted work.",
    explanationBullets: [
      "Memoization trades memory for fewer renders",
      "Props must remain stable for memoization to help",
    ],
    citations: [{ title: "React – Memoizing Components", url: "https://react.dev/reference/react/memo" }],
    chainOfThought:
      "Every keystroke triggers a parent render, so all rows render again. `React.memo(UserRow)` tells React to bail out when props haven't changed. As long as the rows receive stable props (e.g., the same object reference), the memoization eliminates the unnecessary work while still updating when a row actually changes.",
    code: "const UserRow = React.memo(function UserRow({ user }: { user: User }) {\n  return (\n    <tr>\n      <td>{user.name}</td>\n      <td>{user.role}</td>\n    </tr>\n  );\n});",
  },
  {
    topic: TOPICS.REACT,
    subtopic: SUBTOPICS.React.ContextApi,
    statement: "Context lets distant descendants read shared data without prop drilling.",
    question:
      "A theme toggle in the navbar needs to update button styles buried five levels deep. What's the most maintainable way to share the theme state?",
    options: [
      "Create a ThemeContext provider high in the tree and read it with useContext where needed.",
      "Store the theme in a global mutable variable and import it inside children.",
      "Pass the theme prop manually through every intermediate component.",
      "Use `window.theme` and read it with a DOM query from the button.",
    ],
    correctIndex: 0,
    difficulty: "Easy",
    bloomLevel: "Understand",
    explanation: "Context providers expose shared values to any descendant without drilling props through the tree.",
    explanationBullets: [
      "Context is ideal for global settings like themes",
      "useContext reads the current value from the provider",
    ],
    citations: [
      {
        title: "React – Passing Data Deeply with Context",
        url: "https://react.dev/learn/passing-data-deeply-with-context",
      },
    ],
    chainOfThought:
      "Prop drilling would require touching multiple components just to move the theme value. A ThemeContext provider near the root can hold the theme state and expose a toggle function. Any button calls `useContext(ThemeContext)` to consume it, staying in sync without manual wiring.",
  },
  {
    topic: TOPICS.REACT,
    subtopic: SUBTOPICS.React.ErrorBoundaries,
    statement:
      "Error boundaries catch rendering errors in their child tree and render a fallback UI instead of crashing the app.",
    question:
      "A third-party widget occasionally throws during render and breaks the entire page. What is the recommended React pattern to isolate the failure and show a recovery UI?",
    options: [
      "Wrap the widget in an error boundary component that renders a fallback on errors.",
      "Move the widget into a try/catch inside the component function body.",
      "Call `window.onerror` to suppress the exception globally.",
      "Catch the error in a useEffect cleanup and ignore it.",
    ],
    correctIndex: 0,
    difficulty: "Medium",
    bloomLevel: "Evaluate",
    explanation:
      "Error boundaries use lifecycle methods to catch rendering errors and let you display a fallback UI without unmounting the whole app.",
    explanationBullets: [
      "Only class components can implement componentDidCatch",
      "Boundaries isolate failures to a subtree",
    ],
    citations: [
      {
        title: "React – Error Boundaries",
        url: "https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary",
      },
    ],
    chainOfThought:
      "Render-time exceptions bypass try/catch in the component body. An error boundary implemented via `componentDidCatch` can wrap the widget, catch the error, and render a friendly message while the rest of the page remains interactive.",
    code: "class WidgetBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {\n  state = { hasError: false };\n\n  static getDerivedStateFromError() {\n    return { hasError: true };\n  }\n\n  componentDidCatch(error: Error) {\n    console.error('Widget crashed', error);\n  }\n\n  render() {\n    if (this.state.hasError) {\n      return <p>Unable to load widget. Try again later.</p>;\n    }\n    return this.props.children;\n  }\n}",
  },
  // JavaScript examples
  {
    topic: TOPICS.JAVASCRIPT,
    subtopic: SUBTOPICS.JavaScript.ArrayPrototypeMethods,
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
    topic: TOPICS.JAVASCRIPT,
    subtopic: SUBTOPICS.JavaScript.AsyncAwaitPromises,
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
    topic: TOPICS.JAVASCRIPT,
    subtopic: SUBTOPICS.JavaScript.AsyncAwaitPromises,
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
    topic: TOPICS.JAVASCRIPT,
    subtopic: SUBTOPICS.JavaScript.AsyncAwaitPromises,
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
    topic: TOPICS.JAVASCRIPT,
    subtopic: SUBTOPICS.JavaScript.AsyncAwaitPromises,
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
    topic: TOPICS.JAVASCRIPT,
    subtopic: SUBTOPICS.JavaScript.AsyncAwaitPromises,
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
    topic: TOPICS.JAVASCRIPT,
    subtopic: SUBTOPICS.JavaScript.AsyncAwaitPromises,
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
  {
    topic: TOPICS.JAVASCRIPT,
    subtopic: SUBTOPICS.JavaScript.ClosuresLexicalScope,
    statement: "Closures capture variables by reference, so `var` inside a loop shares one binding across iterations.",
    question:
      "Running the counters below logs `4` three times. Which change makes the output `1`, `2`, `3` as intended?",
    options: [
      "Replace `var i` with `let i` so each iteration gets its own binding.",
      "Call the returned functions immediately inside the loop.",
      "Reset `i = 0` before pushing each counter to the array.",
      "Move the console.log outside the `for` loop entirely.",
    ],
    correctIndex: 0,
    difficulty: "Medium",
    bloomLevel: "Analyze",
    explanation:
      "`var` is function-scoped, so all closures share the final value. Using `let` creates a new binding per iteration, and each closure captures the expected number.",
    explanationBullets: [
      "Closures capture variables, not values",
      "Block scope with let/const isolates each loop iteration",
    ],
    citations: [{ title: "MDN – Closures", url: "https://developer.mozilla.org/docs/Web/JavaScript/Closures" }],
    chainOfThought:
      "The `buildCounters` loop finishes with `i === 4`, and each stored arrow function closes over that single `var i`. Changing the declaration to `let` gives each iteration its own lexical binding, so calling the functions later reads 1, 2, and 3 respectively.",
    code: "function buildCounters() {\n  const counters = [];\n  for (let i = 1; i <= 3; i++) {\n    counters.push(() => console.log(i));\n  }\n  return counters;\n}\n\nconst counters = buildCounters();\ncounters.forEach((fn) => fn());",
  },
  // TypeScript examples
  {
    topic: TOPICS.TYPESCRIPT,
    subtopic: SUBTOPICS.TypeScript.TypeNarrowing,
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
  {
    topic: TOPICS.TYPESCRIPT,
    subtopic: SUBTOPICS.TypeScript.ReactComponentPropsTyping,
    statement: "React's TypeScript types expose specific handler aliases for DOM events.",
    question:
      "You are typing a button component that forwards an `onClick` callback. Which prop type ensures callers receive the correct `MouseEvent<HTMLButtonElement>` signature?",
    options: [
      "`onClick?: React.MouseEventHandler<HTMLButtonElement>`",
      "`onClick?: () => MouseEvent`",
      "`onClick?: MouseEvent`",
      "`onClick?: React.MouseEvent<HTMLButtonElement>`",
    ],
    correctIndex: 0,
    difficulty: "Easy",
    bloomLevel: "Understand",
    explanation:
      "`React.MouseEventHandler` describes a callback that receives the event and returns void. The other options either return the wrong type or represent the event object itself, not the handler.",
    explanationBullets: [
      "Handler aliases encode the full callback signature",
      "Typing props precisely gives consumers accurate intellisense",
    ],
    citations: [
      {
        title: "React TypeScript Cheatsheet – Events",
        url: "https://react-typescript-cheatsheet.netlify.app/docs/basic/getting-started/forms_and_events/",
      },
    ],
    chainOfThought:
      "The prop should be a function invoked by React with the click event. `React.MouseEventHandler<HTMLButtonElement>` expands to `(event: MouseEvent<HTMLButtonElement>) => void`, which is exactly what we need. The other answers either treat the event as the prop value or return an event, so they wouldn't type-check usage inside the component.",
    code: "type ButtonProps = {\n  children: React.ReactNode;\n  onClick?: React.MouseEventHandler<HTMLButtonElement>;\n};\n\nfunction Button({ children, onClick }: ButtonProps) {\n  return <button onClick={onClick}>{children}</button>;\n}",
  },
  {
    topic: TOPICS.TYPESCRIPT,
    subtopic: SUBTOPICS.TypeScript.GenericComponents,
    statement: "Generics let component props stay type-safe for arbitrary value shapes.",
    question:
      "You are building a reusable `Select` component where each option should return the original value type. Which prop definition preserves the specific value type for callers?",
    options: [
      "`type SelectProps<T> = { options: Array<{ label: string; value: T }>; onChange: (value: T) => void; };`",
      "`type SelectProps = { options: string[]; onChange: Function; };`",
      "`type SelectProps<T> = { options: T; onChange: T; };`",
      "`type SelectProps<T> = { options: Array<{ label: string; value: unknown }>; onChange: (value: unknown) => void; };`",
    ],
    correctIndex: 0,
    difficulty: "Medium",
    bloomLevel: "Apply",
    explanation:
      "The first option threads the generic `T` through both the options array and the callback, so callers get strong typing. The other choices erase type information or use incompatible shapes.",
    explanationBullets: [
      "Generics ensure callbacks return the same type that was provided",
      "Avoid `unknown` or `Function` when the exact type is known",
    ],
    citations: [
      {
        title: "TypeScript Handbook – Generics",
        url: "https://www.typescriptlang.org/docs/handbook/2/generics.html",
      },
    ],
    chainOfThought:
      "We want `Select<string>` to give back strings and `Select<User>` to give back a `User`. The generic props type with `Array<{ value: T }>` and `onChange: (value: T) => void` maintains that relationship. The other options drop the type information, so the compiler can't protect consumers.",
    code: "function Select<T>({ options, onChange }: SelectProps<T>) {\n  return (\n    <select onChange={(e) => onChange(options[e.target.selectedIndex].value)}>\n      {options.map((option) => (\n        <option key={option.label}>{option.label}</option>\n      ))}\n    </select>\n  );\n}\n\ntype SelectProps<T> = {\n  options: Array<{ label: string; value: T }>;\n  onChange: (value: T) => void;\n};",
  },
  // HTML example
  {
    topic: TOPICS.HTML,
    subtopic: SUBTOPICS.HTML.DocumentStructureSemantics,
    statement: "Semantic elements convey structure for humans and assistive tech.",
    question:
      "You are converting a marketing page to be more accessible. Which change best improves semantic structure?",
    options: [
      'Wrap sections with <div class="section">',
      'Replace <div id="nav"> with <nav>',
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
  {
    topic: TOPICS.HTML,
    subtopic: SUBTOPICS.HTML.FormsValidationBasics,
    statement: "Built-in form validation attributes provide guardrails without JavaScript.",
    question:
      "A signup form should block submission when the email is empty or malformed. Which markup change leverages native validation correctly?",
    options: [
      'Add `type="email"` and `required` to the input element.',
      'Wrap the input in a <section> with aria-live="polite".',
      'Set minlength="5" on the input and rely on pattern matching.',
      'Give the submit button type="reset" so invalid values are cleared.',
    ],
    correctIndex: 0,
    difficulty: "Easy",
    bloomLevel: "Apply",
    explanation:
      "`type=email` triggers the browser's email address validation, and `required` prevents submitting blank values, covering both failure cases without custom scripts.",
    explanationBullets: ["Native validation reduces custom JS", "`required` blocks empty submissions"],
    citations: [
      { title: "MDN – Form validation", url: "https://developer.mozilla.org/docs/Learn/Forms/Form_validation" },
    ],
    chainOfThought:
      "The team wants to rely on the browser. Combining `type=email` with `required` instructs the user agent to check the format and presence automatically. The other options do not enforce validation—they only affect announcements, length, or button behavior.",
    code: '<form>\n  <label>Email\n    <input type="email" name="email" required />\n  </label>\n  <button type="submit">Create account</button>\n</form>',
  },
  {
    topic: TOPICS.HTML,
    subtopic: SUBTOPICS.HTML.AccessibilityFundamentals,
    statement: "Accessible forms connect labels to controls so screen readers announce context.",
    question:
      'QA reports that a search input is announced as "edit text" with no description. What is the minimal HTML fix?',
    options: [
      "Wrap the input in a <label> or reference it with `for` so the label text is announced.",
      "Add placeholder text and rely on it for description.",
      'Set tabindex="-1" to remove it from the tab order.',
      'Add role="textbox" even though the element is already an <input>.',
    ],
    correctIndex: 0,
    difficulty: "Medium",
    bloomLevel: "Analyze",
    explanation:
      "Explicit labels programmatically associate text with the input, giving assistive technology the correct announcement.",
    explanationBullets: ["`label` elements improve accessibility", "Placeholder text is not a substitute for labels"],
    citations: [{ title: "W3C – Labels in HTML", url: "https://www.w3.org/WAI/tutorials/forms/labels/" }],
    chainOfThought:
      "Screen readers rely on the accessible name. Without a label, the input exposes an empty name, so the announcement lacks context. Wrapping the input or linking via `for` binds the readable text to the control. Placeholder text isn't guaranteed to be read, and tabindex or role changes don't solve the naming issue.",
    code: '<label for="site-search">Search the docs</label>\n<input id="site-search" name="q" type="search" />',
  },
  // CSS example
  {
    topic: TOPICS.CSS,
    subtopic: SUBTOPICS.CSS.FlexboxFundamentals,
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
  {
    topic: TOPICS.CSS,
    subtopic: SUBTOPICS.CSS.GridLayoutBasics,
    statement: "Grid can auto-fit columns that respect a minimum width while filling the available space.",
    question:
      "A gallery should display between two and four cards per row depending on viewport width. Which grid definition achieves this without media queries?",
    options: [
      "`grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));`",
      "`grid-template-columns: repeat(4, 25%);`",
      "`grid-template-columns: 200px;`",
      "`grid-template-columns: repeat(auto-fill, 4fr);`",
    ],
    correctIndex: 0,
    difficulty: "Medium",
    bloomLevel: "Apply",
    explanation:
      "`auto-fit` with `minmax` grows the number of tracks as space allows while honoring the minimum width, collapsing to fewer columns on narrow screens.",
    explanationBullets: ["minmax defines flexible track sizes", "auto-fit collapses empty tracks"],
    citations: [{ title: "MDN – CSS Grid repeat()", url: "https://developer.mozilla.org/docs/Web/CSS/repeat" }],
    chainOfThought:
      "We need responsive columns without breakpoints. The `repeat(auto-fit, minmax(200px, 1fr))` pattern creates as many 200px columns as fit and lets them grow to fill the row. The fixed 25% columns or single 200px track ignore the responsive requirement, and auto-fill/4fr doesn't enforce a minimum width.",
    code: ".gallery {\n  display: grid;\n  gap: 1rem;\n  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));\n}",
  },
  {
    topic: TOPICS.CSS,
    subtopic: SUBTOPICS.CSS.ResponsiveDesignTechniques,
    statement: "Mobile-first media queries adjust layout for wider screens when needed.",
    question:
      "A landing page stacks sections vertically on mobile but should display them in two columns on desktops wider than 960px. What CSS pattern follows responsive best practices?",
    options: [
      "Define the base single-column layout, then add `@media (min-width: 960px)` to switch to a two-column grid.",
      "Start with a desktop grid and add `@media (max-width: 960px)` to override everything for mobile.",
      "Set both columns with fixed pixel widths so they never wrap.",
      "Use inline styles to set widths with JavaScript on resize.",
    ],
    correctIndex: 0,
    difficulty: "Easy",
    bloomLevel: "Understand",
    explanation:
      "Mobile-first styling keeps the default lightweight. A min-width media query enhances the layout for larger screens without duplicating overrides.",
    explanationBullets: ["Start with the narrowest layout", "Min-width queries layer on enhancements"],
    citations: [
      {
        title: "MDN – Using Media Queries",
        url: "https://developer.mozilla.org/docs/Web/CSS/Media_Queries/Using_media_queries",
      },
    ],
    chainOfThought:
      "The base stylesheet should serve mobile users by default. A min-width media query then promotes the layout to a two-column grid when there is room. Desktop-first with max-width overrides often leads to more complicated cascade management, and fixed widths or JS resizing break responsiveness.",
    code: ".sections {\n  display: grid;\n  gap: 1.5rem;\n}\n\n@media (min-width: 960px) {\n  .sections {\n    grid-template-columns: 1fr 1fr;\n  }\n}",
  },
  // State Management example
  {
    topic: TOPICS.STATE_MANAGEMENT,
    subtopic: SUBTOPICS.StateManagement.ReactContextApi,
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
  {
    topic: TOPICS.STATE_MANAGEMENT,
    subtopic: SUBTOPICS.StateManagement.StateLiftingPatterns,
    statement: "Lifting state centralizes a shared source of truth for sibling components.",
    question:
      "Sibling inputs need to stay in sync when editing the same customer object. Currently each component owns its own `useState`. What's the best refactor to prevent divergent values?",
    options: [
      "Lift the customer state into the common parent and pass down setter callbacks.",
      "Use uncontrolled inputs so React stops managing the state.",
      "Store the customer in a global variable exported from a module.",
      "Duplicate the state but keep a setInterval to sync the values.",
    ],
    correctIndex: 0,
    difficulty: "Easy",
    bloomLevel: "Understand",
    explanation:
      "When multiple components need the same data, lifting state to their nearest common parent ensures there's a single source of truth and avoids synchronization bugs.",
    explanationBullets: ["Parent owns the canonical data", "Children receive props and callbacks"],
    citations: [
      {
        title: "React – State: A Single Source of Truth",
        url: "https://react.dev/learn/sharing-state-between-components",
      },
    ],
    chainOfThought:
      "Separate `useState` hooks mean each sibling updates independently, so they drift. Hoisting the state into the parent lets each child receive props and notify changes via callbacks, keeping both views aligned.",
  },
  {
    topic: TOPICS.STATE_MANAGEMENT,
    subtopic: SUBTOPICS.StateManagement.ReduxToolkitBasics,
    statement: "Redux Toolkit slices co-locate reducers, actions, and initial state with minimal boilerplate.",
    question:
      "A team rewrites legacy Redux to Redux Toolkit. Which approach follows best practices for defining a slice?",
    options: [
      "Use `createSlice` to declare initialState and reducer functions, exporting the generated actions and reducer.",
      "Keep separate action type constants and hand-written switch statements in every reducer.",
      "Mutate state directly inside components and dispatch plain numbers instead of actions.",
      "Define reducers as async functions that return promises from createSlice.",
    ],
    correctIndex: 0,
    difficulty: "Medium",
    bloomLevel: "Apply",
    explanation:
      "`createSlice` generates immutable reducer logic under the hood and exposes action creators aligned with the slice, reducing boilerplate while keeping redux patterns intact.",
    explanationBullets: [
      "Redux Toolkit encourages slice-first structure",
      "Immer allows writing mutating syntax safely",
    ],
    citations: [{ title: "Redux Toolkit – createSlice", url: "https://redux-toolkit.js.org/api/createSlice" }],
    chainOfThought:
      "Modern Redux uses slices to bundle state and reducers. `createSlice` auto-generates action creators and handles immutable updates, so teams don't need manual constants or switch statements. The other options either ignore Toolkit or misuse async reducers.",
    code: "const todosSlice = createSlice({\n  name: 'todos',\n  initialState: [] as Todo[],\n  reducers: {\n    added(state, action: PayloadAction<Todo>) {\n      state.push(action.payload);\n    },\n    toggled(state, action: PayloadAction<string>) {\n      const todo = state.find((t) => t.id === action.payload);\n      if (todo) todo.completed = !todo.completed;\n    },\n  },\n});",
  },
  // Accessibility example
  {
    topic: TOPICS.ACCESSIBILITY,
    subtopic: SUBTOPICS.Accessibility.FocusManagementKeyboardNavigation,
    statement: "Interactive components must remain keyboard accessible.",
    question:
      "A custom modal traps focus but the close button is only clickable with a mouse. What's the minimal change to restore accessibility?",
    options: [
      'Set tabindex="-1" on the close button',
      "Replace the <div> with a <button> element",
      "Remove the focus trap entirely",
      'Add role="presentation" to the close control',
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
  {
    topic: TOPICS.ACCESSIBILITY,
    subtopic: SUBTOPICS.Accessibility.AriaRolesAttributes,
    statement:
      "ARIA attributes communicate widget state changes to assistive technology when semantics alone are insufficient.",
    question:
      "A disclosure chevron toggles content visibility but screen readers never learn whether the section is open. Which attribute pairing fixes the announcement while keeping native semantics?",
    options: [
      "Set `aria-expanded` on the trigger button and reference the panel with `aria-controls`.",
      'Add role="presentation" to both the button and the panel.',
      'Apply aria-hidden="true" to the panel whenever it is visible.',
      'Use tabindex="-1" on the panel so it can receive focus.',
    ],
    correctIndex: 0,
    difficulty: "Medium",
    bloomLevel: "Analyze",
    explanation:
      "The button remains a semantic control, and toggling `aria-expanded` communicates its state. `aria-controls` points to the content region so assistive tech can form the relationship.",
    explanationBullets: [
      "Buttons announcing expanded state improve comprehension",
      "`aria-hidden` should mirror actual visibility",
    ],
    citations: [
      {
        title: "WAI-ARIA Authoring Practices – Disclosure",
        url: "https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/",
      },
    ],
    chainOfThought:
      "The button already toggles visibility, but nothing exposes the state change. Adding `aria-expanded` reflects whether the content is shown, and `aria-controls` links the button to the controlled panel. The other options strip semantics or hide visible content, reducing accessibility.",
    code: '<button aria-expanded="false" aria-controls="faq-1" id="faq-trigger">Shipping FAQ</button>\n<section id="faq-1" hidden>...</section>',
  },
  {
    topic: TOPICS.ACCESSIBILITY,
    subtopic: SUBTOPICS.Accessibility.ColorContrastTheming,
    statement: "Sufficient color contrast ensures text remains legible for users with low vision.",
    question:
      "Design proposes a light gray (#9AA0A6) text on a white background for body copy. WCAG requires 4.5:1 contrast for normal text. What adjustment meets the guideline?",
    options: [
      "Darken the text color to #5F6368 (contrast ≈ 4.6:1) or darker.",
      "Increase letter spacing without changing colors.",
      "Underline the text but keep the same colors.",
      "Reduce the font size so less area needs contrast.",
    ],
    correctIndex: 0,
    difficulty: "Medium",
    bloomLevel: "Evaluate",
    explanation:
      "WCAG focuses on luminance contrast. Darkening the text raises the ratio above 4.5:1, while spacing or decoration changes do not satisfy the requirement.",
    explanationBullets: [
      "Contrast ratio depends on relative luminance",
      "Visual flourishes cannot replace sufficient contrast",
    ],
    citations: [{ title: "WCAG 2.1 – Contrast (Minimum)", url: "https://www.w3.org/TR/WCAG21/#contrast-minimum" }],
    chainOfThought:
      "To meet 4.5:1, we must increase contrast—either darken text or lighten background. Choosing a darker gray like #5F6368 crosses the threshold. Adjusting letter spacing or adding underlines doesn't affect luminance contrast, and reducing font size worsens readability.",
  },
  // Testing example
  {
    topic: TOPICS.TESTING,
    subtopic: SUBTOPICS.Testing.AsyncTestingPatterns,
    statement: "React Testing Library encourages assertions that await UI updates.",
    question:
      "When testing a component that fetches data on mount, which RTL helper waits for the element to appear before asserting?",
    options: ["screen.getByText", "screen.findByText", "screen.queryByText", "screen.debug"],
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
  {
    topic: TOPICS.TESTING,
    subtopic: SUBTOPICS.Testing.ComponentRenderingQueries,
    statement: "React Testing Library prioritizes queries that resemble how users find elements.",
    question:
      "A form test currently selects the email field with `screen.getByTestId('email-input')`. Which change makes the test more resilient while mirroring real usage?",
    options: [
      "Query the control by its accessible label using `screen.getByLabelText('Email')`.",
      "Switch to `container.querySelector('#email-input')` within the test.",
      "Prefer `getByPlaceholderText` so the placeholder text becomes the selector.",
      "Add more data-testid attributes and use `getAllByTestId` instead.",
    ],
    correctIndex: 0,
    difficulty: "Easy",
    bloomLevel: "Understand",
    explanation:
      "Testing Library suggests label- or role-based queries because they track what users perceive. This reduces brittleness when markup changes but accessible names remain stable.",
    explanationBullets: [
      "Accessible name queries outlive structural changes",
      "Data attributes are lower-priority fallbacks",
    ],
    citations: [
      {
        title: "Testing Library – Priority of Queries",
        url: "https://testing-library.com/docs/queries/about/#priority",
      },
    ],
    chainOfThought:
      "The label text is how users identify the field. Using `getByLabelText` aligns the test with assistive tech, so a refactor that preserves the label won't break assertions. DOM selectors or extra test IDs depend on implementation details instead of behavior.",
  },
  {
    topic: TOPICS.TESTING,
    subtopic: SUBTOPICS.Testing.MockingFundamentals,
    statement: "Mocking network calls keeps component tests deterministic and fast.",
    question:
      "A component fetches suggestions via `fetch`. Tests fail intermittently because the real API is slow. What is the recommended fix?",
    options: [
      "Mock the HTTP request (e.g., with MSW or jest.fn) to return predictable test data.",
      "Raise the test timeout so the live API has time to respond.",
      "Insert manual `setTimeout` delays before every assertion.",
      "Disable the flaky test until the API stabilizes.",
    ],
    correctIndex: 0,
    difficulty: "Medium",
    bloomLevel: "Apply",
    explanation:
      "Component tests should not depend on live services. Mocking isolates the fetch call, guaranteeing consistent results and faster feedback.",
    explanationBullets: ["Mocks remove external variability", "Deterministic tests surface regressions faster"],
    citations: [
      {
        title: "Testing Library – Mocking API Calls",
        url: "https://testing-library.com/docs/react-testing-library/example-intro/#mocking-api-calls",
      },
    ],
    chainOfThought:
      "Integration-style tests remain reliable when the network layer is simulated. Mocking returns known data immediately, so assertions run against a stable contract instead of waiting on real latency or outages.",
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
    `[mcq-examples] Missing examples for topics: ${missingTopics.join(
      ", "
    )}. Update data/mcq-examples.ts to cover the MVP ontology.`
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
