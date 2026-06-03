import { useState } from "react";
import { modules } from "./data/codeModules";
import CodeViewer from "./components/CodeViewer";
import Sidebar from "./components/Sidebar";
import OverviewPanel from "./components/OverviewPanel";
import TradeoffPanel from "./components/TradeoffPanel";

type ActivePanel = "overview" | "tradeoffs" | string;

const EXTRA_ITEMS = [
  { id: "overview", label: "Visão Geral & Arquitetura", icon: "🗺️" },
  { id: "tradeoffs", label: "Análise de Tradeoffs", icon: "⚖️" },
];

export default function App() {
  const [activePanel, setActivePanel] = useState<ActivePanel>("overview");
  const [activeExtra, setActiveExtra] = useState<string>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleSelectModule = (id: string) => {
    setActivePanel(id);
    setActiveExtra("");
  };

  const handleSelectExtra = (id: string) => {
    setActivePanel(id);
    setActiveExtra(id);
  };

  const activeModule = modules.find((m) => m.id === activePanel);

  const renderMain = () => {
    if (activePanel === "overview") return <OverviewPanel />;
    if (activePanel === "tradeoffs") return <TradeoffPanel />;
    if (activeModule) return <CodeViewer module={activeModule} />;
    return null;
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 overflow-hidden">

      {/* Top Bar */}
      <header className="flex items-center gap-3 px-4 py-2.5 bg-slate-900 border-b border-slate-700/60 flex-shrink-0 z-10">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          title="Toggle sidebar"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Logo / Title */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center text-sm">
            🏥
          </div>
          <div className="min-w-0">
            <span className="text-sm font-semibold text-slate-100 truncate block">Agente de Agendamento</span>
            <span className="text-[10px] text-slate-500 truncate block">n8n → Python · FastAPI · LangChain · Redis · Pinecone</span>
          </div>
        </div>

        <div className="flex-1" />

        {/* Breadcrumb */}
        <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-500">
          {activeModule ? (
            <>
              <span>{activeModule.tags[0]}</span>
              <span>/</span>
              <span className="text-slate-300 font-mono">{activeModule.filename}</span>
            </>
          ) : (
            <span className="text-slate-300">
              {activePanel === "overview" ? "🗺️ Visão Geral" : "⚖️ Tradeoffs"}
            </span>
          )}
        </div>

        {/* Language badge */}
        {activeModule && (
          <span className="hidden sm:inline-flex items-center rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-400">
            {activeModule.language}
          </span>
        )}

        {/* GitHub-style file counter */}
        <div className="hidden lg:flex items-center gap-1 text-xs text-slate-600">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>{modules.length} arquivos</span>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar */}
        <div
          className={`flex-shrink-0 transition-all duration-200 overflow-hidden ${
            sidebarOpen ? "w-56" : "w-0"
          }`}
        >
          {sidebarOpen && (
            <Sidebar
              modules={modules}
              activeId={activeModule?.id ?? ""}
              onSelect={handleSelectModule}
              extraItems={EXTRA_ITEMS}
              activeExtra={activeExtra}
              onSelectExtra={handleSelectExtra}
            />
          )}
        </div>

        {/* Main content */}
        <main className="flex-1 overflow-hidden bg-slate-950">
          {renderMain()}
        </main>
      </div>

      {/* Bottom status bar */}
      <footer className="flex items-center justify-between px-4 py-1 bg-violet-900/30 border-t border-violet-700/20 flex-shrink-0 text-[10px] text-violet-400/60">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Pronto para deploy
          </span>
          <span>Python 3.12+</span>
          <span>FastAPI · LangChain · Redis · Pinecone</span>
        </div>
        <div className="flex items-center gap-3">
          <span>Migrado de n8n v1</span>
          <span>~950 linhas · 16 módulos</span>
        </div>
      </footer>
    </div>
  );
}
