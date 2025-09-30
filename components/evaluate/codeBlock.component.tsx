import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Highlight, themes } from "prism-react-renderer";

interface ICodeBlockProps {
  content: string;
  defaultLanguage?: string;
}

/**
 * CodeBlock Component
 *
 * Renders markdown with syntax highlighting for code blocks.
 * Used for both question text and separate code snippets.
 */
export default function CodeBlock({ content, defaultLanguage = "tsx" }: ICodeBlockProps) {
  return (
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
          if (!hasLanguage) {
            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          }

          const language = className.replace("language-", "") || defaultLanguage;
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
      {content}
    </ReactMarkdown>
  );
}
