import FlowDiagram from "./FlowDiagram";

const stats = [
  { label: "Módulos Python", value: "16", icon: "🐍", color: "text-emerald-400" },
  { label: "Nós n8n traduzidos", value: "48", icon: "🔄", color: "text-blue-400" },
  { label: "Tools LangChain", value: "6", icon: "🛠️", color: "text-purple-400" },
  { label: "Linhas de código", value: "~950", icon: "📝", color: "text-orange-400" },
  { label: "Vendor lock-in", value: "Zero", icon: "🔓", color: "text-pink-400" },
  { label: "Escalabilidade", value: "∞ workers", icon: "🚀", color: "text-cyan-400" },
];

const features = [
  {
    icon: "⚡",
    title: "FastAPI + Uvicorn",
    desc: "Webhook assíncrono de alta performance. Retorna 200 imediatamente e processa em background — sem timeout do WhatsApp.",
  },
  {
    icon: "🔄",
    title: "Debounce de Mensagens",
    desc: "Redis RPUSH + asyncio.sleep(2s) + pipeline atômico. Agrupa mensagens fracionadas exatamente como o n8n fazia.",
  },
  {
    icon: "🔒",
    title: "Bloqueio do Agente",
    desc: "fromMe=true → Redis SET com TTL. Humano assumiu o atendimento? IA para automaticamente.",
  },
  {
    icon: "🤖",
    title: "LangChain AgentExecutor",
    desc: "OpenAI Tools Agent com memória Redis por sessão (telefone), tools de Calendar, RAG Pinecone e Think tool.",
  },
  {
    icon: "📅",
    title: "Google Calendar direto",
    desc: "4 tools LangChain (criar/listar/buscar/deletar) substituem toda a stack MCP do n8n. Mais simples, mais rápido.",
  },
  {
    icon: "⏰",
    title: "APScheduler (09:00)",
    desc: "Confirmações diárias automáticas sem depender do n8n Schedule Trigger. Roda dentro do mesmo processo.",
  },
  {
    icon: "🗃️",
    title: "Pinecone RAG",
    desc: "Mesmo índice 'n8nyt'. Script CLI para ingestão de documentos locais ou Google Drive. Chunk overlap 100 preservado.",
  },
  {
    icon: "🐳",
    title: "Docker Compose",
    desc: "App + Redis em containers. Deploy em qualquer VPS, Kubernetes, Railway, Fly.io ou ECS sem mudanças.",
  },
];

export default function OverviewPanel() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto p-6 space-y-8">

        {/* Hero */}
        <div className="rounded-2xl bg-gradient-to-br from-violet-900/40 via-blue-900/30 to-slate-900/40 border border-violet-500/20 p-6">
          <div className="flex items-start gap-4">
            <div className="text-5xl">🏥</div>
            <div>
              <h1 className="text-2xl font-bold text-white">Agente de Agendamento</h1>
              <p className="mt-1 text-slate-300">
                Migração completa do fluxo n8n para <span className="text-emerald-400 font-semibold">Python puro</span> — sem vendor lock-in, escalável, open-source.
              </p>
              <p className="mt-2 text-sm text-slate-400">
                Stack: <span className="text-blue-400">FastAPI</span> · <span className="text-purple-400">LangChain</span> · <span className="text-pink-400">Redis</span> · <span className="text-orange-400">Pinecone</span> · <span className="text-green-400">Google Calendar API</span> · <span className="text-yellow-400">OpenAI</span>
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl bg-slate-800/60 border border-slate-700/50 p-3 text-center">
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Architecture Flow */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <span>🗺️</span> Arquitetura — Mapeamento de Nós
          </h2>
          <p className="text-xs text-slate-500 mb-4">Passe o mouse sobre os blocos para ver detalhes de cada componente.</p>
          <FlowDiagram />
        </div>

        {/* Features */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <span>✨</span> Funcionalidades Preservadas
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {features.map((f) => (
              <div key={f.title} className="rounded-xl bg-slate-800/40 border border-slate-700/40 p-4 hover:border-slate-600 transition-colors">
                <div className="text-2xl mb-2">{f.icon}</div>
                <h3 className="text-sm font-semibold text-slate-200 mb-1">{f.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Start */}
        <div className="rounded-xl bg-slate-800/40 border border-slate-700/40 p-5">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span>🚀</span> Quick Start
          </h2>
          <div className="space-y-3">
            {[
              { step: "1", cmd: "cp .env.example .env && nano .env", desc: "Configure as credenciais (OpenAI, Redis, Pinecone, Google, Evolution API)" },
              { step: "2", cmd: "pip install -r requirements.txt", desc: "Instale as dependências Python 3.12+" },
              { step: "3", cmd: "python scripts/ingest_documents.py --folder ./docs", desc: "Ingira os documentos da clínica no Pinecone" },
              { step: "4", cmd: "docker compose up -d", desc: "Suba a aplicação + Redis em containers" },
              { step: "5", cmd: "curl http://localhost:8000/health", desc: "Verifique que está rodando" },
              { step: "6", cmd: "# Configure o webhook da Evolution API para POST /clinica", desc: "Aponte o webhook do WhatsApp para sua URL pública" },
            ].map(({ step, cmd, desc }) => (
              <div key={step} className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-violet-500/20 border border-violet-500/40 flex items-center justify-center text-xs font-bold text-violet-400">
                  {step}
                </div>
                <div className="min-w-0">
                  <code className="text-xs text-emerald-400 font-mono bg-slate-900/60 rounded px-2 py-0.5 block mb-0.5">
                    {cmd}
                  </code>
                  <p className="text-xs text-slate-500">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Notice */}
        <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4">
          <div className="flex gap-3">
            <span className="text-xl flex-shrink-0">⚠️</span>
            <div>
              <h3 className="text-sm font-semibold text-amber-400 mb-1">Inputs necessários para deploy completo</h3>
              <ul className="text-xs text-amber-300/70 space-y-1 list-disc list-inside">
                <li><strong>Google Service Account JSON</strong>: com acesso ao Calendar e Sheets (coloque em <code>credentials/</code>)</li>
                <li><strong>Pinecone API Key</strong> + índice <code>n8nyt</code> criado (ou altere o nome no .env)</li>
                <li><strong>Evolution API</strong>: URL + API Key + Instance configurada com webhook apontando para <code>/clinica</code></li>
                <li><strong>OpenAI API Key</strong>: para GPT-4o-mini, GPT-4o e Whisper</li>
                <li><strong>Redis</strong>: já incluso no docker-compose, ou use Redis Cloud/Upstash</li>
              </ul>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
