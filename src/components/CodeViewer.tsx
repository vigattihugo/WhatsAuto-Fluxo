import { useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import type { CodeModule } from "../data/codeModules";

interface Props {
  module: CodeModule;
}

export default function CodeViewer({ module }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(module.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const lineCount = module.code.split("\n").length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 p-4 border-b border-slate-700/60 bg-slate-800/40 flex-shrink-0">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm font-semibold text-emerald-400">
              {module.filename}
            </span>
            <span className="text-xs text-slate-500">{lineCount} linhas</span>
          </div>
          <p className="mt-1 text-xs text-slate-400 leading-relaxed">
            {module.description}
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {module.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-full bg-slate-700/60 px-2 py-0.5 text-xs font-medium text-slate-400"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
        <button
          onClick={handleCopy}
          className={`flex-shrink-0 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
            copied
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
              : "bg-slate-700/60 text-slate-300 border border-slate-600/40 hover:bg-slate-700 hover:text-white"
          }`}
        >
          {copied ? (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Copiado!
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copiar
            </>
          )}
        </button>
      </div>

      {/* Code */}
      <div className="flex-1 overflow-auto">
        <SyntaxHighlighter
          language={module.language === "dockerfile" ? "docker" : module.language}
          style={vscDarkPlus}
          showLineNumbers
          customStyle={{
            margin: 0,
            borderRadius: 0,
            background: "transparent",
            fontSize: "0.75rem",
            lineHeight: "1.6",
            minHeight: "100%",
          }}
          lineNumberStyle={{
            color: "#4a5568",
            minWidth: "3em",
            paddingRight: "1em",
            userSelect: "none",
          }}
        >
          {module.code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}
