'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  /** Raw Mermaid source from inside a ```mermaid fence. */
  source: string;
}

/**
 * Renders a Mermaid diagram inline in a chat message.
 *
 * Loaded dynamically (ssr:false) from ChatMessage so the ~200kb Mermaid
 * bundle stays out of the main chat route until a diagram actually appears.
 *
 * Mermaid is a structured DSL → SVG library; the SVG it emits is not
 * arbitrary HTML and is set with `securityLevel: 'strict'` (no inline
 * scripts, no onclick). Same safety posture Mermaid recommends for
 * untrusted LLM-emitted source — important here because Clara's source
 * comes from an LLM that processes potentially-malicious YouTube transcripts.
 *
 * On parse error, falls back to a labeled `<pre><code>` block so a malformed
 * diagram from Clara never blanks the message.
 */
export default function MermaidRenderer({ source }: Props) {
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() =>
    typeof document !== 'undefined' &&
    document.documentElement.classList.contains('dark'),
  );

  const renderIdRef = useRef(`mermaid-${Math.random().toString(36).slice(2, 11)}`);

  useEffect(() => {
    const root = document.documentElement;
    const checkTheme = () => setIsDarkMode(root.classList.contains('dark'));
    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: isDarkMode ? 'dark' : 'default',
          securityLevel: 'strict',
          fontFamily: 'inherit',
        });
        const { svg } = await mermaid.render(renderIdRef.current, source);
        if (!cancelled) {
          setSvg(svg);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to render diagram');
          setSvg(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [source, isDarkMode]);

  if (error) {
    return (
      <div className="my-3 rounded-md border border-border/40 overflow-hidden">
        <div className="bg-muted/30 px-3 py-1.5 text-xs font-mono text-secondary border-b border-border/40">
          diagram
        </div>
        <pre className="p-3 text-xs overflow-auto bg-black/2 dark:bg-white/2">
          <code>{source}</code>
        </pre>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="my-3 rounded-md border border-border/40 bg-muted/20 p-6 flex items-center justify-center min-h-[120px]">
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-2 w-2 rounded-full bg-accent animate-pulse"
              style={{ animationDelay: `${i * 200}ms` }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="my-3 rounded-md overflow-hidden border border-border/40">
      <div className="bg-muted/30 px-3 py-1.5 text-xs font-mono text-secondary border-b border-border/40">
        diagram
      </div>
      {/*
        Mermaid renders its DSL into SVG; injecting the emitted SVG via
        dangerouslySetInnerHTML is the documented approach.
      */}
      <div
        className="overflow-x-auto p-4 bg-black/2 dark:bg-white/2 [&_svg]:max-w-full [&_svg]:h-auto"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </div>
  );
}
