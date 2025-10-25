import { cn } from "@/utils/tailwind.utils";
import { IMcqItemView } from "@/types/mcq.types";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Highlight, themes } from "prism-react-renderer";
import { useMemo } from "react";

function PlaceholderChip({ label }: { label: string }) {
  return (
    <span className='inline-flex items-center rounded-full border px-2 py-0.5 text-xs text-gray-700 dark:text-gray-300'>
      {label}
    </span>
  );
}

export default function McqCard({ item }: { item: IMcqItemView }) {
  const normalizedQuestion = useMemo(() => {
    if (!item?.question) return "";
    // Merge isolated inline-code lines back into the surrounding sentence
    // Example: "... if the\n`startTransition`\nfunction ..." → "... if the `startTransition` function ..."
    return item.question.replace(/\n\s*`([^`]+)`\s*\n/gm, " `$1` ");
  }, [item?.question]);
  return (
    <div className='rounded-lg border bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950'>
      <div className='mb-3 flex flex-wrap items-center gap-2'>
        <PlaceholderChip label={item.subtopic} />
        <PlaceholderChip label={item.bloomLevel} />
        <PlaceholderChip label={item.difficulty} />
        {item.version ? <PlaceholderChip label={`v${item.version}`} /> : null}
      </div>
      <div className='prose prose-sm max-w-none break-words dark:prose-invert'>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            p({ children, ...props }) {
              return (
                <p className='mb-3 break-words' {...props}>
                  {children}
                </p>
              );
            },
            code({ className, children, ...props }) {
              const hasLanguage = typeof className === "string" && className.includes("language-");
              // Treat as inline unless a language class is present (i.e., fenced code block)
              if (!hasLanguage) {
                return (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              }

              const language = className.replace("language-", "") || "javascript";
              return (
                <div className='mb-4 overflow-auto'>
                  <Highlight theme={themes.vsDark} code={String(children).replace(/\n$/, "")} language={language}>
                    {({ className, style, tokens, getLineProps, getTokenProps }) => (
                      <pre
                        style={{
                          ...style,
                          margin: 0,
                          borderRadius: "0.375rem",
                          fontSize: "0.75rem",
                          lineHeight: "1.25rem",
                          padding: "0.75rem",
                        }}
                        className={className}
                      >
                        {tokens.map((line, i) => (
                          <div key={i} {...getLineProps({ line })}>
                            {line.map((token, key) => (
                              <span key={key} {...getTokenProps({ token })} />
                            ))}
                          </div>
                        ))}
                      </pre>
                    )}
                  </Highlight>
                </div>
              );
            },
          }}
        >
          {normalizedQuestion}
        </ReactMarkdown>
      </div>
      {item.code ? (
        <div className='mt-3'>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({ className, children }) {
                const hasLanguage = typeof className === "string" && className.includes("language-");
                const language = hasLanguage ? className.replace("language-", "") : "tsx";
                return (
                  <div className='overflow-auto'>
                    <Highlight theme={themes.vsDark} code={String(children).replace(/\n$/, "")} language={language}>
                      {({ className, style, tokens, getLineProps, getTokenProps }) => (
                        <pre
                          style={{
                            ...style,
                            margin: 0,
                            borderRadius: "0.375rem",
                            fontSize: "0.75rem",
                            lineHeight: "1.25rem",
                            padding: "0.75rem",
                          }}
                          className={className}
                        >
                          {tokens.map((line, i) => (
                            <div key={i} {...getLineProps({ line })}>
                              {line.map((token, key) => (
                                <span key={key} {...getTokenProps({ token })} />
                              ))}
                            </div>
                          ))}
                        </pre>
                      )}
                    </Highlight>
                  </div>
                );
              },
            }}
          >
            {item.code}
          </ReactMarkdown>
        </div>
      ) : null}
      <div className='mt-3 grid gap-2'>
        {item.options.map((opt, idx) => (
          <div
            key={idx}
            className={cn(
              "flex items-center justify-between rounded-md border p-2 text-sm",
              idx === item.correctIndex
                ? "border-emerald-500/60 bg-emerald-50 dark:border-emerald-600/70 dark:bg-emerald-950/30"
                : "dark:border-gray-800"
            )}
          >
            <span className='font-medium'>{String.fromCharCode(65 + idx)}.</span>
            <span className='ml-2 flex-1'>{opt}</span>
            {idx === item.correctIndex ? (
              <span className='ml-2 text-xs text-emerald-700 dark:text-emerald-300'>Correct</span>
            ) : null}
          </div>
        ))}
      </div>
      <div className='mt-4'>
        {item.explanation ? (
          <div className='mb-3 rounded-md bg-gray-50 p-3 text-xs dark:bg-gray-900/40'>
            <div className='mb-1 font-medium text-gray-700 dark:text-gray-300'>Explanation</div>
            <p className='text-gray-800 dark:text-gray-200'>{item.explanation}</p>
            {Array.isArray(item.explanationBullets) && item.explanationBullets.length > 0 ? (
              <ul className='mt-2 list-disc pl-5 text-gray-800 dark:text-gray-200'>
                {item.explanationBullets.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
        <div className='text-xs font-medium text-gray-500 dark:text-gray-400'>Citations</div>
        <ul className='mt-1 list-disc pl-5 text-xs text-gray-700 dark:text-gray-300'>
          {item.citations.map((c, i) => (
            <li key={i}>
              <a href={c.url} target='_blank' className='underline underline-offset-2'>
                {c.title ?? c.url}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
