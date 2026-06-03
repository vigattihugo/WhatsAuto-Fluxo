interface TradeoffRow {
  category: string;
  n8n: string;
  python: string;
  reason: string;
  icon: string;
}

const rows: TradeoffRow[] = [
  {
    category: "Orquestração",
    n8n: "n8n (visual, low-code)",
    python: "FastAPI + APScheduler",
    reason: "Controle total do código, sem vendor lock-in, escalável horizontalmente com múltiplos workers.",
    icon: "🔧",
  },
  {
    category: "Vector Store",
    n8n: "Pinecone (n8nyt index)",
    python: "Pinecone (mesmo índice ✓)",
    reason: "Mantivemos o Pinecone para preservar o índice existente. Alternativas: ChromaDB (local/dev), pgvector (se já usa Postgres), Qdrant (self-hosted alta performance).",
    icon: "🗃️",
  },
  {
    category: "Memória de Chat",
    n8n: "Redis Chat Memory (n8n node)",
    python: "RedisChatMessageHistory (LangChain Community)",
    reason: "Redis mantém contexto por sessão (telefone). Mesma lógica, implementação nativa LangChain. TTL configurável.",
    icon: "🧠",
  },
  {
    category: "Mensagens Fracionadas",
    n8n: "Redis RPUSH + Wait (2s) + LRANGE + DEL",
    python: "asyncio.sleep + Redis pipeline atômico",
    reason: "Mesmo algoritmo de debounce: acumula mensagens em lista Redis, aguarda 2s, consome tudo atomicamente. Mais seguro com pipeline.",
    icon: "⏱️",
  },
  {
    category: "Bloqueio do Agente",
    n8n: "Redis SET 'BloquearAgente' + KEYS",
    python: "Redis SET/GET com TTL (1h default)",
    reason: "Detecta fromMe=true (humano respondeu) e bloqueia o agente automaticamente. TTL evita bloqueio permanente.",
    icon: "🔒",
  },
  {
    category: "LLM Principal",
    n8n: "OpenAI gpt-4o-mini (LangChain node)",
    python: "ChatOpenAI gpt-4o-mini (LangChain)",
    reason: "Mesmo modelo, mesma biblioteca. Temperatura 0 para respostas determinísticas e consistentes.",
    icon: "🤖",
  },
  {
    category: "Calendar MCP",
    n8n: "MCP Client → MCP Server Trigger → Google Calendar Tool",
    python: "Google Calendar API direta (4 tools LangChain)",
    reason: "Eliminamos a camada MCP desnecessária. Tools diretas são mais simples, mais rápidas e sem ponto único de falha extra.",
    icon: "📅",
  },
  {
    category: "Transcrição de Áudio",
    n8n: "Evolution API → Convert to File → OpenAI Whisper",
    python: "Evolution API → base64_decode → OpenAI Whisper",
    reason: "Sem conversão de arquivo intermediária — decodifica base64 em memória e envia direto para Whisper via AsyncOpenAI.",
    icon: "🎤",
  },
  {
    category: "Confirmações Diárias",
    n8n: "Schedule Trigger (09:00) → AI Agent2 → Split Out → Loop → AI Agent1 → Evolution API",
    python: "APScheduler CronTrigger (09:00) → Calendar API → mensagem fixa → Evolution API",
    reason: "Removemos 2 chamadas de LLM desnecessárias. O texto de confirmação é fixo/determinístico — não precisa de agente para isso. Economiza tokens e latência.",
    icon: "⏰",
  },
  {
    category: "Google Sheets",
    n8n: "Google Sheets node (OAuth2)",
    python: "gspread (Service Account)",
    reason: "Service Account é mais adequado para servidores. Não requer fluxo OAuth interativo. Lookup + append preservado.",
    icon: "📊",
  },
  {
    category: "Ingestão de Documentos",
    n8n: "Manual Trigger → Google Drive → Loop → Pinecone",
    python: "Script CLI (ingest_documents.py) local ou Google Drive",
    reason: "Script reutilizável executado manualmente ou via CI/CD. Suporta PDF, DOCX, TXT, MD. Mesmo chunk_overlap=100 do n8n.",
    icon: "📄",
  },
  {
    category: "Deploy",
    n8n: "Gerenciado pelo n8n Cloud/self-hosted",
    python: "Docker Compose (app + Redis)",
    reason: "Container isolado, sem dependência de plataforma, CI/CD simples, escala horizontal com múltiplos workers Uvicorn.",
    icon: "🚀",
  },
];

export default function TradeoffTable() {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-700">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-700 bg-slate-800/60">
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Componente</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-amber-400">n8n Original</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-emerald-400">Python Equivalente</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Decisão / Tradeoff</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={row.category}
              className={`border-b border-slate-700/50 transition-colors hover:bg-slate-800/30 ${
                i % 2 === 0 ? "bg-slate-900/20" : ""
              }`}
            >
              <td className="px-4 py-3 font-medium text-slate-200 whitespace-nowrap">
                <span className="mr-2">{row.icon}</span>
                {row.category}
              </td>
              <td className="px-4 py-3 text-amber-300/80 font-mono text-xs">
                {row.n8n}
              </td>
              <td className="px-4 py-3 text-emerald-300/80 font-mono text-xs">
                {row.python}
              </td>
              <td className="px-4 py-3 text-slate-400 text-xs leading-relaxed max-w-xs">
                {row.reason}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
