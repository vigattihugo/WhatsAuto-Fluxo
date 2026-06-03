import React from "react";

interface FlowNode {
  id: string;
  label: string;
  type: "trigger" | "process" | "condition" | "ai" | "external" | "storage";
  description: string;
}

const nodeColors: Record<FlowNode["type"], string> = {
  trigger:   "bg-emerald-500/20 border-emerald-500 text-emerald-300",
  process:   "bg-blue-500/20 border-blue-500 text-blue-300",
  condition: "bg-yellow-500/20 border-yellow-500 text-yellow-300",
  ai:        "bg-purple-500/20 border-purple-500 text-purple-300",
  external:  "bg-orange-500/20 border-orange-500 text-orange-300",
  storage:   "bg-pink-500/20 border-pink-500 text-pink-300",
};

const nodeIcons: Record<FlowNode["type"], string> = {
  trigger:   "⚡",
  process:   "⚙️",
  condition: "🔀",
  ai:        "🤖",
  external:  "🌐",
  storage:   "🗄️",
};

const phases = [
  {
    title: "1. Entrada & Cadastro",
    color: "border-emerald-500/40 bg-emerald-950/20",
    nodes: [
      { id: "wh", label: "POST /clinica\n(Webhook)", type: "trigger" as const, description: "FastAPI recebe payload da Evolution API" },
      { id: "ef", label: "Edit Fields\n(Extração)", type: "process" as const, description: "Extrai nome, telefone, tipo, fromMe, mensagem" },
      { id: "gs", label: "Google Sheets\n(Lookup/Append)", type: "external" as const, description: "Verifica se paciente existe; cadastra se não" },
    ],
  },
  {
    title: "2. Roteamento de Mensagem",
    color: "border-blue-500/40 bg-blue-950/20",
    nodes: [
      { id: "sw", label: "Switch\n(tipo mensagem)", type: "condition" as const, description: "conversation → texto | audioMessage → transcrição" },
      { id: "au", label: "Whisper\n(Transcrição)", type: "ai" as const, description: "Evolution API → base64 → OpenAI Whisper → texto" },
    ],
  },
  {
    title: "3. Controle de Fluxo",
    color: "border-yellow-500/40 bg-yellow-950/20",
    nodes: [
      { id: "fm", label: "fromMe?\n(If1)", type: "condition" as const, description: "Detecta se humano respondeu → bloqueia agente" },
      { id: "rd", label: "Redis\n(BloquearAgente)", type: "storage" as const, description: "SET/GET flag de bloqueio do agente (TTL 1h)" },
      { id: "db", label: "Debounce\n(Mensagem Fracionada)", type: "storage" as const, description: "RPUSH → Sleep 2s → LRANGE → DEL (agrupa msgs)" },
    ],
  },
  {
    title: "4. Agente IA",
    color: "border-purple-500/40 bg-purple-950/20",
    nodes: [
      { id: "ag", label: "AI Agent\n(gpt-4o-mini)", type: "ai" as const, description: "LangChain AgentExecutor com tools e memória Redis" },
      { id: "rm", label: "Redis Memory\n(por telefone)", type: "storage" as const, description: "ConversationBufferWindowMemory → Redis" },
      { id: "ct", label: "Calendar Tools\n(CRUD eventos)", type: "external" as const, description: "Criar/Listar/Buscar/Deletar eventos Google Calendar" },
      { id: "pt", label: "Pinecone RAG\n(dados_clinica)", type: "storage" as const, description: "Retriever de informações da clínica via embeddings" },
      { id: "ev", label: "Evolution API\n(send message)", type: "external" as const, description: "Envia resposta via WhatsApp" },
    ],
  },
  {
    title: "5. Confirmações Diárias",
    color: "border-orange-500/40 bg-orange-950/20",
    nodes: [
      { id: "sc", label: "APScheduler\n(09:00 daily)", type: "trigger" as const, description: "Substitui o Schedule Trigger do n8n" },
      { id: "ca", label: "Google Calendar\n(list amanhã)", type: "external" as const, description: "Lista eventos do dia seguinte" },
      { id: "cf", label: "Confirmação\n(msg fixa)", type: "process" as const, description: "Monta mensagem e envia via WhatsApp" },
    ],
  },
  {
    title: "6. Ingestão RAG",
    color: "border-pink-500/40 bg-pink-950/20",
    nodes: [
      { id: "sc2", label: "Script Manual\n(ingest_documents.py)", type: "trigger" as const, description: "Substitui o Manual Trigger do n8n" },
      { id: "gd", label: "Google Drive\n(ou pasta local)", type: "external" as const, description: "Baixa/lê documentos da clínica" },
      { id: "pi", label: "Pinecone\n(insert chunks)", type: "storage" as const, description: "Splitter → Embeddings OpenAI → Pinecone upsert" },
    ],
  },
];

export default function FlowDiagram() {
  return (
    <div className="space-y-4">
      {phases.map((phase) => (
        <div
          key={phase.title}
          className={`rounded-xl border ${phase.color} p-4`}
        >
          <h3 className="mb-3 text-sm font-semibold text-slate-300 uppercase tracking-wider">
            {phase.title}
          </h3>
          <div className="flex flex-wrap gap-3">
            {phase.nodes.map((node, i) => (
              <React.Fragment key={node.id}>
                <div className="group relative">
                  <div
                    className={`flex flex-col items-center gap-1 rounded-lg border px-3 py-2 text-center text-xs font-medium cursor-default transition-all hover:scale-105 ${nodeColors[node.type]}`}
                    style={{ minWidth: "110px" }}
                  >
                    <span className="text-base">{nodeIcons[node.type]}</span>
                    <span className="whitespace-pre-line leading-tight">{node.label}</span>
                  </div>
                  {/* Tooltip */}
                  <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 w-48 rounded-lg bg-slate-800 border border-slate-600 p-2 text-xs text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-xl">
                    {node.description}
                  </div>
                </div>
                {i < phase.nodes.length - 1 && (
                  <div className="flex items-center text-slate-600 text-lg">→</div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      ))}

      {/* Legenda */}
      <div className="flex flex-wrap gap-3 pt-2 border-t border-slate-700/50">
        {Object.entries(nodeColors).map(([type, cls]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded border ${cls}`} />
            <span className="text-xs text-slate-400 capitalize">{nodeIcons[type as FlowNode["type"]]} {type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
