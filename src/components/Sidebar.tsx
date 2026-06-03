import type { CodeModule } from "../data/codeModules";

interface Props {
  modules: CodeModule[];
  activeId: string;
  onSelect: (id: string) => void;
  extraItems?: { id: string; label: string; icon: string }[];
  activeExtra?: string;
  onSelectExtra?: (id: string) => void;
}

const groupLabels: Record<string, string> = {
  setup: "⚙️ Setup & Configuração",
  fastapi: "🌐 API / Webhook",
  pipeline: "🔄 Pipeline Principal",
  agents: "🤖 Agentes IA",
  tools: "🛠️ Tools (LangChain)",
  memory: "🧠 Memória",
  services: "📡 Serviços",
  scripts: "📦 Scripts",
  docker: "🐳 Docker / Deploy",
  scheduler: "⏰ Scheduler",
  redis: "🗄️ Redis",
  "google-sheets": "📊 Google Sheets",
  "evolution-api": "💬 Evolution API",
  langchain: "🔗 LangChain",
  openai: "✨ OpenAI",
  pinecone: "📌 Pinecone RAG",
  "google-calendar": "📅 Google Calendar",
  ingestion: "📄 Ingestão",
  "redis-memory": "🧠 Redis Memory",
  "rag": "🗃️ RAG",
  reasoning: "💡 Reasoning",
  orquestração: "🎯 Orquestração",
  audio: "🎤 Áudio",
  deploy: "🚀 Deploy",
  whisper: "🎙️ Whisper",
  async: "⚡ Async",
  dependências: "📦 Dependências",
  configuração: "🔧 Configuração",
};

function groupModules(modules: CodeModule[]) {
  // Agrupa por primeiro tag
  const groups: Record<string, CodeModule[]> = {};
  for (const mod of modules) {
    const key = mod.tags[0] || "outros";
    if (!groups[key]) groups[key] = [];
    groups[key].push(mod);
  }
  return groups;
}

export default function Sidebar({ modules, activeId, onSelect, extraItems, activeExtra, onSelectExtra }: Props) {
  const groups = groupModules(modules);

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-slate-900/80 border-r border-slate-700/50">
      <div className="p-3 border-b border-slate-700/50 flex-shrink-0">
        <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Arquivos</p>
      </div>

      {/* Extra items (overview, tradeoffs) */}
      {extraItems && (
        <div className="px-2 pt-2 pb-1">
          {extraItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onSelectExtra?.(item.id)}
              className={`w-full text-left flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors ${
                activeExtra === item.id
                  ? "bg-violet-500/20 text-violet-300 font-medium"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}

      {extraItems && <div className="border-t border-slate-700/40 mx-2 my-1" />}

      {/* Grouped modules */}
      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-3">
        {Object.entries(groups).map(([groupKey, mods]) => (
          <div key={groupKey}>
            <p className="px-2 pb-1 text-[10px] text-slate-600 uppercase tracking-wider font-semibold truncate">
              {groupLabels[groupKey] || groupKey}
            </p>
            <div className="space-y-0.5">
              {mods.map((mod) => (
                <button
                  key={mod.id}
                  onClick={() => onSelect(mod.id)}
                  className={`w-full text-left flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors ${
                    activeId === mod.id
                      ? "bg-blue-500/20 text-blue-300 font-medium"
                      : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  }`}
                >
                  <span className="text-slate-600 text-[10px] font-mono leading-none">
                    {mod.language === "python" ? "🐍" :
                     mod.language === "yaml" ? "🐳" :
                     mod.language === "bash" ? "🔧" :
                     mod.language === "text" ? "📄" :
                     mod.language === "dockerfile" ? "🐳" : "📝"}
                  </span>
                  <span className="truncate font-mono">{mod.filename}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
