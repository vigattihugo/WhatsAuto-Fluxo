import TradeoffTable from "./TradeoffTable";

export default function TradeoffPanel() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto p-6 space-y-6">

        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>⚖️</span> Análise de Tradeoffs
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Mapeamento completo das decisões técnicas ao migrar do n8n para Python. Cada linha representa um nó ou grupo de nós do fluxo original.
          </p>
        </div>

        <TradeoffTable />

        {/* Deep dive sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">

          {/* Pinecone vs alternativas */}
          <div className="rounded-xl border border-orange-500/20 bg-orange-950/10 p-4">
            <h3 className="text-sm font-semibold text-orange-400 mb-3 flex items-center gap-2">
              <span>🗃️</span> Vector Store — Pinecone mantido vs alternativas
            </h3>
            <div className="space-y-2 text-xs">
              {[
                { name: "Pinecone ✅ (escolhido)", pro: "Mesmo índice n8nyt, gerenciado, zero infra", con: "Custo em produção, vendor lock-in leve" },
                { name: "ChromaDB", pro: "Open-source, local, sem custo, ótimo p/ dev", con: "Self-hosted em produção, menos escalável" },
                { name: "pgvector", pro: "Integra com Postgres existente, SQL familiar", con: "Exige Postgres, extensão, tuning manual" },
                { name: "Qdrant", pro: "Alta performance, open-source, cloud/self-hosted", con: "Infra adicional para gerenciar" },
                { name: "Weaviate", pro: "Schema rico, multi-tenancy nativo", con: "Complexidade de configuração maior" },
              ].map((item) => (
                <div key={item.name} className="rounded-lg bg-slate-800/40 p-2">
                  <div className="font-semibold text-slate-200 mb-1">{item.name}</div>
                  <div className="text-emerald-400/70">✓ {item.pro}</div>
                  <div className="text-red-400/70">✗ {item.con}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Redis roles */}
          <div className="rounded-xl border border-pink-500/20 bg-pink-950/10 p-4">
            <h3 className="text-sm font-semibold text-pink-400 mb-3 flex items-center gap-2">
              <span>🗄️</span> Redis — 3 papéis diferentes no sistema
            </h3>
            <div className="space-y-2 text-xs">
              {[
                {
                  role: "1. Bloqueio do Agente",
                  key: "BloquearAgente",
                  cmd: "SET BloquearAgente true EX 3600",
                  desc: "fromMe=true → humano assumiu → agente para por 1h",
                  color: "border-l-red-500",
                },
                {
                  role: "2. Fila de Mensagens (Debounce)",
                  key: "MensagemPicotada{telefone}",
                  cmd: "RPUSH → sleep(2s) → LRANGE → DEL",
                  desc: "Agrupa mensagens enviadas em rafada no mesmo 'turno'",
                  color: "border-l-yellow-500",
                },
                {
                  role: "3. Memória de Chat",
                  key: "chat:{telefone}",
                  cmd: "RedisChatMessageHistory TTL=7d",
                  desc: "Histórico de conversa por paciente — contexto do agente",
                  color: "border-l-blue-500",
                },
              ].map((item) => (
                <div key={item.role} className={`rounded-lg bg-slate-800/40 p-2 border-l-2 ${item.color} pl-3`}>
                  <div className="font-semibold text-slate-200 mb-0.5">{item.role}</div>
                  <code className="text-emerald-400/80 block mb-0.5">{item.key}</code>
                  <code className="text-blue-400/70 text-[10px] block mb-1">{item.cmd}</code>
                  <div className="text-slate-500">{item.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Agent tools */}
          <div className="rounded-xl border border-purple-500/20 bg-purple-950/10 p-4">
            <h3 className="text-sm font-semibold text-purple-400 mb-3 flex items-center gap-2">
              <span>🛠️</span> Tools do Agente Principal
            </h3>
            <div className="space-y-1.5 text-xs">
              {[
                { name: "criar_evento", origin: "Google Calendar Tool (criar)", desc: "Agenda nova consulta" },
                { name: "listar_eventos", origin: "Google Calendar Tool (getAll)", desc: "Verifica disponibilidade e agendamentos" },
                { name: "buscar_evento", origin: "Google Calendar Tool (get)", desc: "Detalhes de um evento específico" },
                { name: "deletar_evento", origin: "Google Calendar Tool (delete)", desc: "Remove consulta ao remarcar" },
                { name: "dados_clinica", origin: "Pinecone Vector Store (retrieve-as-tool)", desc: "RAG de informações da clínica" },
                { name: "pensar", origin: "toolThink (n8n)", desc: "Chain-of-thought interno antes de agir" },
              ].map((t) => (
                <div key={t.name} className="flex gap-2 rounded-lg bg-slate-800/40 p-2">
                  <code className="text-purple-400 font-mono text-[11px] min-w-[120px] flex-shrink-0">{t.name}</code>
                  <div>
                    <div className="text-amber-400/70 text-[10px]">n8n: {t.origin}</div>
                    <div className="text-slate-400">{t.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Confirmations flow */}
          <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/10 p-4">
            <h3 className="text-sm font-semibold text-cyan-400 mb-3 flex items-center gap-2">
              <span>⏰</span> Confirmações — Simplificação vs n8n
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <div className="text-amber-400/80 font-semibold mb-1">n8n (5 nós + 2 LLM calls):</div>
                <div className="text-slate-500 font-mono text-[10px] space-y-0.5">
                  <div>Schedule Trigger (09:00)</div>
                  <div>→ AI Agent2 [gpt-4o] + MCP + Think2 (busca eventos)</div>
                  <div>→ Structured Output Parser (JSON schema)</div>
                  <div>→ Split Out → Loop Over Items1</div>
                  <div>→ AI Agent1 [gpt-4o] + Think1 (monta msg)</div>
                  <div>→ Evolution API2 (envia)</div>
                </div>
              </div>
              <div className="border-t border-slate-700/50 pt-3">
                <div className="text-emerald-400/80 font-semibold mb-1">Python (1 função + 0 LLM calls):</div>
                <div className="text-slate-500 font-mono text-[10px] space-y-0.5">
                  <div>APScheduler CronTrigger (09:00)</div>
                  <div>→ list_events_tool (Calendar API direto)</div>
                  <div>→ _send_confirmation() [texto fixo, sem LLM]</div>
                  <div>→ send_text_message() (Evolution API)</div>
                </div>
                <div className="mt-2 text-emerald-400/60">
                  ✓ ~70% menos tokens | ✓ ~5x mais rápido | ✓ Mais determinístico
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Escala */}
        <div className="rounded-xl border border-slate-600/30 bg-slate-800/20 p-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <span>📈</span> Escalabilidade
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="space-y-1">
              <div className="text-slate-400 font-semibold">Deploy simples (VPS único)</div>
              <code className="text-emerald-400/80 block">uvicorn main:app --workers 4</code>
              <div className="text-slate-500">4 workers assíncronos = centenas de conexões simultâneas</div>
            </div>
            <div className="space-y-1">
              <div className="text-slate-400 font-semibold">Deploy médio (múltiplas instâncias)</div>
              <code className="text-emerald-400/80 block">docker compose --scale app=3</code>
              <div className="text-slate-500">Redis centralizado garante consistência entre instâncias</div>
            </div>
            <div className="space-y-1">
              <div className="text-slate-400 font-semibold">Deploy enterprise (K8s)</div>
              <code className="text-emerald-400/80 block">kubectl scale deploy app --replicas=10</code>
              <div className="text-slate-500">Stateless → escala horizontal ilimitada com Redis externo</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
