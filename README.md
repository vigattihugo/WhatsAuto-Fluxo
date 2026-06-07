# WhatsAuto — Agente de Agendamento para Clínicas

> 🤖 **Dashboard interativo** da arquitetura Python de um agente de IA que automatiza agendamentos via WhatsApp usando LangChain, FastAPI e Redis.

<div align="center">

![React](https://img.shields.io/badge/React-19.2-61dafb?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-7.3-646cff?logo=vite)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.1-38bdf8?logo=tailwindcss)
![License](https://img.shields.io/badge/License-MIT-green)

<img width="1917" height="865" alt="image" src="https://github.com/user-attachments/assets/ddb5015c-bd00-4aef-9493-844834491b8f" />


**[🚀 Demo ao Vivo](#demo) • [📚 Documentação](#arquitetura) • [🛠️ Setup](#instalação)**

</div>

---

## 📋 Visão Geral

WhatsAuto é uma documentação interativa de uma **arquitetura de IA em produção** que:

- 📱 **Automatiza agendamentos** via WhatsApp (Evolution API)
- 🤖 **Executa um agent LangChain** que conversa naturalmente, consulta calendário e confirma horários
- 🔄 **Migração de n8n para Python** — demonstra ganho de escalabilidade e eliminação de vendor lock-in
- ⚡ **Zero downtime** — webhook assíncrono com debounce de mensagens
- 🔒 **Controle inteligente** — detecta quando humano assumiu e pausa a IA automaticamente
- 🗂️ **RAG com Pinecone** — responde perguntas sobre políticas/documentos da clínica

**Este repo** é o **dashboard de visualização** da arquitetura — explore o código Python, veja o fluxo em diagrama, entenda os tradeoffs de cada decisão técnica.

---

## ✨ Features Principais

| Feature | Descrição |
|---------|-----------|
| 📖 **Visão Geral Arquitetural** | Estatísticas, features e fluxo visual do sistema |
| 💻 **Visualizador de Código** | Explore os 16+ módulos Python com syntax highlight |
| ⚖️ **Análise de Tradeoffs** | Decisões técnicas mapeadas lado-a-lado (n8n vs Python, Pinecone vs alternativas, etc.) |
| 📊 **Diagrama de Fluxo** | Visualização em fase do pipeline: Entrada → Roteamento → Controle → IA → Resposta |
| 🎨 **Dark Mode Nativo** | Interface responsiva com Tailwind CSS + Lucide icons |
| 📱 **Mobile-Friendly** | Sidebar colapsável, layout adaptativo |

---

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                     WhatsApp (Evolution API)                │
└──────────────────────────┬──────────────────────────────────┘
                           │ POST /clinica
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   FastAPI + Uvicorn                         │
│  ├─ Webhook Handler (assíncrono, retorna 200 imediatamente)│
│  ├─ Message Debouncer (Redis)                              │
│  └─ Agent Blocker (fromMe detection)                       │
└──────────┬──────────────┬──────────────┬────────────────────┘
           │              │              │
           ▼              ▼              ▼
    ┌──────────────┐ ┌──────────┐ ┌──────────────┐
    │  LangChain   │ │  Redis   │ │ Google APIs  │
    │  AgentExecutor│ │  Memory  │ │ (Calendar /  │
    │  gpt-4o-mini │ │ + Queue  │ │  Sheets)     │
    └──────────────┘ └──────────┘ └──────────────┘
           │              │              │
           ▼              ▼              ▼
    ┌────────────────────────────────────────────┐
    │  Tools do Agente:                          │
    │  • 4 Google Calendar tools (CRUD)          │
    │  • RAG search (Pinecone)                   │
    │  • Think tool (raciocínio)                 │
    │  • Check Agent Lock (Redis)                │
    └────────────────────────────────────────────┘
           │
           ▼
    ┌──────────────────────┐
    │  Google Sheets       │
    │  (histórico pacientes)
    └──────────────────────┘
    ┌──────────────────────┐
    │  Pinecone RAG        │
    │  (docs + polícies)   │
    └──────────────────────┘
```

### 🔑 Componentes Chave

**Backend (Python)** — [Veja estrutura completa no dashboard]
- **entry.py** — Webhook FastAPI
- **agent.py** — LangChain agent executor com tools
- **memory.py** — Redis-backed chat history
- **calendar_tools.py** — 4 tools para Google Calendar (criar, listar, buscar, deletar)
- **rag.py** — Pinecone vector store + document ingestion
- **debouncer.py** — Redis message queue com TTL
- **scheduler.py** — APScheduler para confirmações diárias (09:00)

**Frontend (React)** — Este repo
- `OverviewPanel` — Dashboard com stats e features
- `FlowDiagram` — Visualização em 4 fases do pipeline
- `CodeViewer` — Leitor de código com syntax highlighting
- `TradeoffPanel` — Análise comparativa de decisões
- `TradeoffTable` — Mapeamento n8n nodes → Python tools

---

## 🎯 Caso de Uso

Uma **clínica veterinária** recebe consultas via WhatsApp:

1. **Paciente envia**: "Oi, quero marcar uma consulta na próxima semana"
2. **Sistema**:
   - Transcreve (se áudio) via Whisper
   - Valida se é novo paciente (Google Sheets)
   - Passa para o agent LangChain
3. **Agent**:
   - Consulta calendário disponível (Google Calendar)
   - Oferece 3 horários
   - Marca a consulta se confirmado
   - Responde dúvidas sobre endereço/valores (RAG Pinecone)
4. **Diariamente** (09:00):
   - APScheduler envia confirmação automática
   - Paciente pode rescheduler por mensagem

---

## 🚀 Instalação & Setup

### Pré-requisitos

- **Node.js** ≥ 18
- **npm** ou **yarn**

### 1. Clone e instale dependências

```bash
git clone https://github.com/seu-usuario/whatsauto.git
cd whatsauto
npm install
```

### 2. Development

```bash
npm run dev
```

Abra [http://localhost:5173](http://localhost:5173) no navegador.

### 3. Build para produção

```bash
npm run build
npm run preview
```

A build usa **vite-plugin-singlefile** para gerar um **HTML único** (ideal para self-host ou CDN).

---

## 📚 Como Usar o Dashboard

| Seção | O que faz |
|-------|-----------|
| **🗺️ Visão Geral & Arquitetura** | Veja stats, features principais e diagrama de fluxo |
| **💻 Módulos Python** (Sidebar) | Clique em cada módulo para ver código com syntax highlighting |
| **⚖️ Análise de Tradeoffs** | Entenda por que Python em vez de n8n, por que Pinecone vs alternativas, etc. |
| **📊 Diagrama de Fluxo** | Visualize as 4 fases: Entrada → Roteamento → Controle → IA |

---

## 🔧 Tech Stack

### Frontend
- **React 19.2** — UI library
- **TypeScript 5.9** — Type safety
- **Tailwind CSS 4.1** — Estilo com @tailwindcss/vite
- **Lucide React** — Icons consistentes
- **React Syntax Highlighter** — Highlight de código Python
- **Vite 7.3** — Build tool ultra-rápido
- **vite-plugin-singlefile** — Bundle único para deploy

### Backend (Referenciado no dashboard)
- **FastAPI 0.115** — Web framework
- **LangChain 0.3** — AI orchestration
- **OpenAI (gpt-4o-mini)** — LLM
- **Redis** — Message queue + session memory + agent lock
- **Pinecone** — Vector store (RAG)
- **Google APIs** — Calendar + Sheets
- **APScheduler** — Scheduler cron-like
- **Evolution API** — WhatsApp integration

---

## 📊 Estatísticas do Projeto

```
📦 Módulos Python              16
🔄 Nós n8n traduzidos         48
🛠️  Tools LangChain             6
📝 Linhas de código Python      ~950
🔓 Vendor lock-in              Zero
🚀 Escalabilidade              ∞ workers (async)
⏱️  Latência webhook            <200ms (+ background)
💾 Memória por sessão          7 dias (Redis TTL)
```

---

## 🎨 Componentes Reusáveis

Este projeto pode servir como **template** para documentação técnica interativa:

- **CodeViewer** — Exiba código com preview de features
- **FlowDiagram** — Visualize pipelines/arquitetura
- **TradeoffTable** — Compare decisões técnicas lado-a-lado
- **Sidebar** — Navegação modular com icons

---

## 🤝 Como Contribuir

1. **Fork** este repositório
2. **Crie uma branch**: `git checkout -b feature/sua-feature`
3. **Commit**: `git commit -am 'Add nova feature'`
4. **Push**: `git push origin feature/sua-feature`
5. **Abra um Pull Request**

### Áreas de contribuição bem-vindas

- [ ] Documentação das tools do agent
- [ ] Exemplos de prompts para clínicas específicas
- [ ] Testes de performance
- [ ] Internacionalização (i18n)
- [ ] Temas adicionais (light mode, high contrast)

---

## 📄 Licença

MIT © 2024. Veja [LICENSE](LICENSE) para detalhes.

---

## 🔗 Links Úteis

- 📖 [LangChain Docs](https://python.langchain.com/)
- 🌐 [FastAPI Docs](https://fastapi.tiangolo.com/)
- 🎨 [Tailwind CSS](https://tailwindcss.com/)
- 🔄 [Evolution API](https://evolution-api.com/)
- 🗃️ [Pinecone Docs](https://docs.pinecone.io/)
- ⏰ [APScheduler Docs](https://apscheduler.readthedocs.io/)

---

## ✋ Suporte

Dúvidas? Abra uma [Issue](https://github.com/seu-usuario/whatsauto/issues) no GitHub.

---

<div align="center">

**Feito com ❤️ para automação inteligente de clínicas**

⭐ Se esse projeto foi útil, deixa uma estrela!

</div>
