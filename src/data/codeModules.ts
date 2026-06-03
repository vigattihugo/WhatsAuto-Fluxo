export interface CodeModule {
  id: string;
  title: string;
  filename: string;
  description: string;
  language: string;
  code: string;
  tags: string[];
}

export const modules: CodeModule[] = [
  {
    id: "requirements",
    title: "requirements.txt",
    filename: "requirements.txt",
    description: "Todas as dependências Python necessárias para rodar o agente.",
    language: "text",
    tags: ["setup", "dependências"],
    code: `# Core framework
fastapi==0.115.0
uvicorn[standard]==0.30.6
python-dotenv==1.0.1
pydantic==2.8.2

# LLM & LangChain
langchain==0.3.0
langchain-openai==0.2.0
langchain-community==0.3.0
openai==1.45.0

# Vector Store (Pinecone — mesmo que o original)
pinecone-client==5.0.1
langchain-pinecone==0.2.0

# Redis (mensagens encavaladas + memória de chat)
redis==5.0.8
langchain-redis==0.0.4

# Google APIs
google-auth==2.34.0
google-auth-oauthlib==1.2.1
google-api-python-client==2.143.0

# WhatsApp (Evolution API via HTTP)
httpx==0.27.2

# Audio transcription
# (usa diretamente o cliente OpenAI — já incluso acima)

# Google Sheets
gspread==6.1.2
gspread-dataframe==4.0.0

# Scheduler (substituindo o Schedule Trigger do n8n)
apscheduler==3.10.4

# Async utils
anyio==4.4.0
tenacity==9.0.0
structlog==24.4.0
`,
  },
  {
    id: "env",
    title: ".env.example",
    filename: ".env.example",
    description: "Variáveis de ambiente necessárias. Copie para .env e preencha.",
    language: "bash",
    tags: ["setup", "configuração"],
    code: `# ── OpenAI ──────────────────────────────────────────────
OPENAI_API_KEY=sk-...

# ── Redis ────────────────────────────────────────────────
REDIS_URL=redis://localhost:6379/0

# ── Pinecone ─────────────────────────────────────────────
PINECONE_API_KEY=...
PINECONE_INDEX_NAME=n8nyt          # mesmo índice do fluxo original
PINECONE_ENVIRONMENT=us-east-1-aws

# ── Evolution API (WhatsApp) ─────────────────────────────
EVOLUTION_API_BASE_URL=https://seu-servidor.com
EVOLUTION_API_KEY=sua-api-key
EVOLUTION_INSTANCE_NAME=PensandoAI

# ── Google (OAuth2 Service Account JSON path) ─────────────
GOOGLE_SERVICE_ACCOUNT_FILE=credentials/google_service_account.json
GOOGLE_CALENDAR_ID=seu-calendar@gmail.com
GOOGLE_SHEETS_ID=1vUDO_ialYac7p0N1QkTKce-gBPodku1sWGvwuyNMRZQ

# ── Webhook ──────────────────────────────────────────────
WEBHOOK_PATH=/clinica
WEBHOOK_SECRET=opcional-para-validar-hmac

# ── Agente ───────────────────────────────────────────────
AGENT_MODEL=gpt-4o-mini
CONFIRMATION_MODEL=gpt-4o
WAIT_SECONDS=2                     # delay para agrupar mensagens fracionadas
REDIS_MESSAGE_TTL=120              # TTL da fila de mensagens (segundos)
`,
  },
  {
    id: "config",
    title: "config.py",
    filename: "config.py",
    description: "Configuração central via Pydantic Settings — carrega .env automaticamente.",
    language: "python",
    tags: ["setup", "configuração"],
    code: `"""config.py — configuração centralizada."""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # OpenAI
    openai_api_key: str

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # Pinecone
    pinecone_api_key: str
    pinecone_index_name: str = "n8nyt"
    pinecone_environment: str = "us-east-1-aws"

    # Evolution API
    evolution_api_base_url: str
    evolution_api_key: str
    evolution_instance_name: str = "PensandoAI"

    # Google
    google_service_account_file: str = "credentials/google_service_account.json"
    google_calendar_id: str
    google_sheets_id: str

    # Webhook
    webhook_path: str = "/clinica"
    webhook_secret: str = ""

    # Agente
    agent_model: str = "gpt-4o-mini"
    confirmation_model: str = "gpt-4o"
    wait_seconds: int = 2
    redis_message_ttl: int = 120


settings = Settings()
`,
  },
  {
    id: "main",
    title: "main.py",
    filename: "main.py",
    description: "Entry point FastAPI — registra o webhook, o scheduler de confirmações e sobe o servidor.",
    language: "python",
    tags: ["fastapi", "webhook", "scheduler"],
    code: `"""main.py — entry point da aplicação."""
import asyncio
import uvicorn
from contextlib import asynccontextmanager

from fastapi import FastAPI
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from config import settings
from routers.webhook import router as webhook_router
from services.confirmation import run_daily_confirmations

import structlog

log = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup e shutdown da aplicação."""
    # ── Scheduler: dispara confirmações todo dia às 09:00 ──
    # Equivalente ao "Schedule Trigger" do n8n (triggerAtHour: 9)
    scheduler = AsyncIOScheduler()
    scheduler.add_job(
        run_daily_confirmations,
        CronTrigger(hour=9, minute=0),
        id="daily_confirmations",
        replace_existing=True,
    )
    scheduler.start()
    log.info("scheduler.started")

    yield

    scheduler.shutdown()
    log.info("scheduler.stopped")


app = FastAPI(
    title="Agente de Agendamento",
    version="1.0.0",
    lifespan=lifespan,
)

app.include_router(webhook_router)


@app.get("/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )
`,
  },
  {
    id: "webhook_router",
    title: "routers/webhook.py",
    filename: "routers/webhook.py",
    description: "Recebe o POST da Evolution API (WhatsApp), extrai campos e dispara o pipeline — equivalente aos nós Webhook + Edit Fields do n8n.",
    language: "python",
    tags: ["fastapi", "webhook", "evolution-api"],
    code: `"""routers/webhook.py — recebe eventos do WhatsApp via Evolution API."""
from fastapi import APIRouter, Request, BackgroundTasks, HTTPException
from pydantic import BaseModel
from typing import Any, Optional

from config import settings
from pipeline.main_pipeline import run_pipeline
import structlog

log = structlog.get_logger()
router = APIRouter()


# ── Modelos Pydantic (espelham o payload da Evolution API) ──────────────────

class MessageKey(BaseModel):
    remoteJid: str
    fromMe: bool
    id: str


class Message(BaseModel):
    conversation: Optional[str] = None


class EventData(BaseModel):
    pushName: Optional[str] = None
    key: MessageKey
    messageType: str
    message: Optional[Message] = None


class WebhookPayload(BaseModel):
    data: EventData


class WebhookBody(BaseModel):
    body: WebhookPayload


# ── Endpoint ────────────────────────────────────────────────────────────────

@router.post(settings.webhook_path)
async def receive_whatsapp(
    request: Request,
    background_tasks: BackgroundTasks,
):
    """
    Equivalente ao nó Webhook do n8n.
    Despacha o processamento em background para retornar 200 imediatamente.
    """
    try:
        raw = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="JSON inválido")

    # Extrai campos — equivalente ao nó "Edit Fields" do n8n
    try:
        data = raw.get("data", {})
        key = data.get("key", {})

        nome: str = data.get("pushName", "")
        remote_jid: str = key.get("remoteJid", "")
        telefone: str = remote_jid.replace("@s.whatsapp.net", "")
        tipo_mensagem: str = data.get("messageType", "")
        from_me: bool = key.get("fromMe", False)
        msg_id: str = key.get("id", "")
        mensagem: str = (data.get("message") or {}).get("conversation") or ""

    except Exception as e:
        log.error("webhook.parse_error", error=str(e))
        raise HTTPException(status_code=422, detail="Payload inesperado")

    context = {
        "nome": nome,
        "telefone": telefone,
        "tipo_mensagem": tipo_mensagem,
        "from_me": from_me,
        "msg_id": msg_id,
        "mensagem": mensagem,
        "remote_jid": remote_jid,
    }

    log.info("webhook.received", telefone=telefone, tipo=tipo_mensagem, from_me=from_me)

    # Processa em background — retorna 200 para o WhatsApp não reenviar
    background_tasks.add_task(run_pipeline, context)
    return {"status": "accepted"}
`,
  },
  {
    id: "main_pipeline",
    title: "pipeline/main_pipeline.py",
    filename: "pipeline/main_pipeline.py",
    description: "Orquestra todo o fluxo principal: cadastro, roteamento de tipo de mensagem, anti-loop fromMe, mensagens fracionadas (debounce via Redis), e disparo do agente IA.",
    language: "python",
    tags: ["pipeline", "redis", "orquestração"],
    code: `"""pipeline/main_pipeline.py — orquestrador principal do fluxo."""
import asyncio
import json

from config import settings
from services.sheets import ensure_patient_registered
from services.evolution import get_media_base64, send_text_message
from services.audio import transcribe_audio_base64
from services.redis_client import get_redis
from agents.main_agent import run_main_agent
import structlog

log = structlog.get_logger()

# Chaves Redis
BLOCK_KEY = "BloquearAgente"
MSG_QUEUE_PREFIX = "MensagemPicotada"


async def run_pipeline(ctx: dict) -> None:
    """
    Pipeline completo — espelha todos os nós do fluxo n8n principal.

    Etapas:
      1. Cadastro (Google Sheets)          ← nós Google Sheets / If / Google Sheets1
      2. Roteamento por tipo de mensagem   ← nó Switch
      3. Transcrição de áudio (se áudio)   ← Evolution API → Convert to File → OpenAI
      4. Verificação fromMe / block agent  ← nós If1 / Redis / Redis1 / If2
      5. Mensagem fracionada (debounce)    ← nós Edit Fields2 / Redis2 / Wait / Redis3/4
      6. Agente IA principal               ← nó AI Agent
      7. Resposta WhatsApp                 ← nó Evolution API1
    """
    telefone = ctx["telefone"]
    tipo = ctx["tipo_mensagem"]
    from_me = ctx["from_me"]
    msg_id = ctx["msg_id"]
    mensagem_texto = ctx.get("mensagem") or ""

    # ── 1. CADASTRO ─────────────────────────────────────────────────────────
    # Equivalente: Google Sheets (lookup) → If → Google Sheets1 (append)
    await ensure_patient_registered(nome=ctx["nome"], telefone=telefone)

    # ── 2. ROTEAMENTO POR TIPO DE MENSAGEM ──────────────────────────────────
    # Equivalente: nó Switch (conversation | audioMessage)
    mensagem_audio_texto = ""

    if tipo == "audioMessage":
        log.info("pipeline.audio_message", telefone=telefone)
        # Busca base64 do áudio na Evolution API
        b64 = await get_media_base64(msg_id)
        if b64:
            # Transcreve via OpenAI Whisper
            mensagem_audio_texto = await transcribe_audio_base64(b64)
        log.info("pipeline.audio_transcribed", chars=len(mensagem_audio_texto))

    elif tipo == "conversation":
        # mensagem de texto — usa direto
        pass

    else:
        # Tipo não suportado (imagem, vídeo, sticker etc.) — ignora
        log.info("pipeline.unsupported_type", tipo=tipo)
        return

    # Mensagem final (texto puro ou transcrição do áudio)
    mensagem_final = mensagem_texto or mensagem_audio_texto

    # ── 3. VERIFICAÇÃO fromMe (pausar agente) ───────────────────────────────
    # Equivalente: nó If1 → Redis (set BloquearAgente) → Redis1 (keys)
    redis = await get_redis()
    block_key = BLOCK_KEY

    if from_me:
        # Atendente humano respondeu → bloqueia o agente (TTL = 1h por padrão)
        await redis.set(block_key, "true", ex=3600)
        log.info("pipeline.agent_blocked", telefone=telefone)
        return

    # Verifica se agente está bloqueado
    is_blocked = await redis.get(block_key)
    if is_blocked:
        log.info("pipeline.agent_is_blocked_skip", telefone=telefone)
        return

    # ── 4. MENSAGENS FRACIONADAS (DEBOUNCE) ─────────────────────────────────
    # Equivalente: nós Edit Fields2 / Redis2 (push list) / Wait / Redis3 / Redis4
    # Agrupa mensagens chegando em rafaga num intervalo de WAIT_SECONDS
    queue_key = f"{MSG_QUEUE_PREFIX}{telefone}"

    # Empurra mensagem na lista Redis
    await redis.rpush(queue_key, mensagem_final)

    # Aguarda o debounce (Wait do n8n = 2s)
    await asyncio.sleep(settings.wait_seconds)

    # Lê toda a fila acumulada
    raw_queue = await redis.lrange(queue_key, 0, -1)

    # Só processa se essa execução for a "última" — verifica se a fila ainda
    # existe (outra coroutine pode ter chegado depois e já consumido)
    if not raw_queue:
        log.info("pipeline.queue_already_consumed", telefone=telefone)
        return

    # Deleta a fila (atômico — pipe Redis)
    pipe = redis.pipeline()
    pipe.lrange(queue_key, 0, -1)
    pipe.delete(queue_key)
    results = await pipe.execute()
    mensagens_agrupadas = results[0]  # lista de bytes

    if not mensagens_agrupadas:
        return

    # Converte e junta as mensagens — equivalente ao Edit Fields3 (toString)
    partes = [m.decode() if isinstance(m, bytes) else m for m in mensagens_agrupadas]
    mensagem_consolidada = "\\n".join(partes)

    log.info("pipeline.consolidated_message",
             telefone=telefone,
             partes=len(partes),
             chars=len(mensagem_consolidada))

    # ── 5. AGENTE IA PRINCIPAL ───────────────────────────────────────────────
    # Equivalente: nó AI Agent (gpt-4o-mini + Redis Memory + MCP Calendar + Pinecone)
    resposta = await run_main_agent(
        telefone=telefone,
        mensagem=mensagem_consolidada,
    )

    # ── 6. RESPOSTA VIA WHATSAPP ─────────────────────────────────────────────
    # Equivalente: nó Evolution API1
    if resposta:
        await send_text_message(telefone=telefone, texto=resposta)
        log.info("pipeline.response_sent", telefone=telefone, chars=len(resposta))
`,
  },
  {
    id: "main_agent",
    title: "agents/main_agent.py",
    filename: "agents/main_agent.py",
    description: "Agente LangChain principal com memória Redis, tools de Calendar (via Google API direta), Pinecone RAG e Think tool. Espelha o nó AI Agent do n8n.",
    language: "python",
    tags: ["langchain", "agent", "openai", "redis-memory", "pinecone"],
    code: `"""agents/main_agent.py — agente principal de atendimento."""
from datetime import datetime, timezone
import json

from langchain_openai import ChatOpenAI
from langchain.agents import AgentExecutor, create_openai_tools_agent
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import SystemMessage

from config import settings
from memory.redis_memory import build_redis_memory
from tools.calendar_tools import (
    create_event_tool,
    get_event_tool,
    list_events_tool,
    delete_event_tool,
)
from tools.pinecone_tool import build_pinecone_retriever_tool
from tools.think_tool import think_tool
import structlog

log = structlog.get_logger()

SYSTEM_PROMPT = """Hora atual: {hora_atual}
Telefone do paciente: {telefone}, peça para o paciente confirmar se pode cadastrar usando esse telefone.

Função
Você é um assistente virtual que atua no atendimento de Whatsapps da Consultório Médico Boa Saúde, sua função é atender aos pacientes de maneira objetiva, ágil e eficiente, respondendo dúvidas e auxiliando em agendamentos, cancelamentos ou remarcações de consultas. Seja sempre objetivo, simpático, prestativo, humano e respeitoso.

LOCALIZAÇÃO E CONTATO:
- Endereço: Rua Formoso, numero 100, Setor America, CEP 00.000-000
- Telefone e WhatsApp: (11) 00000-0000
- E-mail: contato@consultorioboaforma.com.br
- Site: www.consultorioboaforma.com.br

MÉDICOS E ESPECIALIDADES:
- Dr. João (Médico Endocrinologista), disponível das 08:00 às 18:00 de segunda a sexta-feira.

VALORES E FORMAS DE PAGAMENTO:
- Consulta: R$ 600,00
- Formas de pagamento: PIX, dinheiro, cartão de débito ou crédito.
- Plano de Saúde/Convênios aceitos: Unimed.

OBJETIVO:
1. Responder dúvidas sobre o Consultório.
2. Agendar, consultar, remarcar e cancelar consultas de forma simples e eficaz.
3. Sempre agir passo a passo para garantir rapidez e precisão.

INSTRUÇÕES IMPORTANTES:
- Ao criar ou editar qualquer evento, incluir sempre o telefone do paciente na descrição.
- Nunca confirme consultas sem o retorno bem-sucedido da tool de Calendar.
- Sempre faça duas verificações antes de confirmar agendamentos.
- Nunca agende antes das 08:00 ou depois das 18:00.
- Nunca agende datas ou horários passados.
- Cada agendamento tem duração de 30 minutos.
- Nunca agende mais de um paciente no mesmo horário.
- Todo paciente só pode ter um agendamento por vez.
- O Summary do evento deve seguir o padrão: "Nome do Paciente - HH:MM - Dr. Nome".
- Se for remarcar, delete o antigo e crie o novo.
- Não forneça diagnósticos ou opiniões médicas.
- Não use emojis ou linguagem informal.
- Não fale que você é uma inteligência artificial — faça atendimento humanizado.
- Qualquer assunto fora do escopo da clínica: informe sua função educadamente.
- Ao receber confirmação de agendamento já existente, responda "Seu agendamento está confirmado!" sem criar novo evento.
- Se o paciente perguntar sobre outros agendamentos que não são dele, não informe.

Quando perguntado sobre Tratamentos ou Informações da clínica, use a tool dados_clinica."""


async def run_main_agent(telefone: str, mensagem: str) -> str:
    """
    Executa o agente principal e retorna a resposta em texto.
    Equivalente ao nó 'AI Agent' do n8n.
    """
    hora_atual = datetime.now(timezone.utc).isoformat()

    # ── LLM ──────────────────────────────────────────────────────────────────
    llm = ChatOpenAI(
        model=settings.agent_model,   # gpt-4o-mini (igual ao n8n)
        api_key=settings.openai_api_key,
        temperature=0,
    )

    # ── Memória Redis (por telefone — equivalente ao Redis Chat Memory do n8n) ─
    memory = await build_redis_memory(session_key=telefone)

    # ── Tools ────────────────────────────────────────────────────────────────
    pinecone_tool = build_pinecone_retriever_tool()

    tools = [
        create_event_tool,
        get_event_tool,
        list_events_tool,
        delete_event_tool,
        pinecone_tool,
        think_tool,
    ]

    # ── Prompt ───────────────────────────────────────────────────────────────
    system_msg = SYSTEM_PROMPT.format(
        hora_atual=hora_atual,
        telefone=telefone,
    )

    prompt = ChatPromptTemplate.from_messages([
        SystemMessage(content=system_msg),
        MessagesPlaceholder(variable_name="chat_history"),
        ("human", "{input}"),
        MessagesPlaceholder(variable_name="agent_scratchpad"),
    ])

    # ── Agente ───────────────────────────────────────────────────────────────
    agent = create_openai_tools_agent(llm=llm, tools=tools, prompt=prompt)

    executor = AgentExecutor(
        agent=agent,
        tools=tools,
        memory=memory,
        verbose=True,
        handle_parsing_errors=True,
        max_iterations=10,
    )

    try:
        result = await executor.ainvoke({"input": mensagem})
        return result.get("output", "")
    except Exception as e:
        log.error("main_agent.error", error=str(e), telefone=telefone)
        return "Desculpe, ocorreu um erro interno. Por favor, tente novamente em instantes."
`,
  },
  {
    id: "calendar_tools",
    title: "tools/calendar_tools.py",
    filename: "tools/calendar_tools.py",
    description: "Tools LangChain para Google Calendar (criar, buscar, listar, deletar eventos). Substitui o MCP Client + Google Calendar Tool do n8n.",
    language: "python",
    tags: ["tools", "google-calendar", "langchain"],
    code: `"""tools/calendar_tools.py — Google Calendar como LangChain tools."""
import json
from datetime import datetime, timedelta, timezone
from typing import Optional

from langchain_core.tools import tool
from googleapiclient.discovery import build
from google.oauth2 import service_account
from pydantic import BaseModel, Field

from config import settings

SCOPES = ["https://www.googleapis.com/auth/calendar"]


def _get_service():
    """Cria cliente autenticado do Google Calendar."""
    creds = service_account.Credentials.from_service_account_file(
        settings.google_service_account_file,
        scopes=SCOPES,
    )
    return build("calendar", "v3", credentials=creds)


# ── Schemas ───────────────────────────────────────────────────────────────────

class CreateEventInput(BaseModel):
    summary: str = Field(description="Título do evento: 'Nome Paciente - HH:MM - Dr. Nome'")
    start_datetime: str = Field(description="Início ISO 8601, ex: 2025-03-10T08:00:00-03:00")
    end_datetime: str = Field(description="Fim ISO 8601 (30 min após início)")
    description: str = Field(description="Nome, telefone, data de nascimento, médico")


class GetEventInput(BaseModel):
    event_id: str = Field(description="ID do evento no Google Calendar")


class ListEventsInput(BaseModel):
    time_min: str = Field(description="Data/hora mínima ISO 8601")
    time_max: str = Field(description="Data/hora máxima ISO 8601")


class DeleteEventInput(BaseModel):
    event_id: str = Field(description="ID do evento a deletar")


# ── Tools ─────────────────────────────────────────────────────────────────────

@tool("criar_evento", args_schema=CreateEventInput)
def create_event_tool(
    summary: str,
    start_datetime: str,
    end_datetime: str,
    description: str,
) -> str:
    """
    Cria um evento no Google Calendar.
    Use para agendar consultas. Sempre verifique conflitos de horário antes.
    Inclua telefone do paciente na descrição.
    """
    service = _get_service()
    event_body = {
        "summary": summary,
        "description": description,
        "start": {"dateTime": start_datetime, "timeZone": "America/Sao_Paulo"},
        "end": {"dateTime": end_datetime, "timeZone": "America/Sao_Paulo"},
    }
    try:
        event = service.events().insert(
            calendarId=settings.google_calendar_id,
            body=event_body,
        ).execute()
        return json.dumps({
            "success": True,
            "event_id": event.get("id"),
            "html_link": event.get("htmlLink"),
            "summary": event.get("summary"),
            "start": event.get("start"),
        })
    except Exception as e:
        return json.dumps({"success": False, "error": str(e)})


@tool("buscar_evento", args_schema=GetEventInput)
def get_event_tool(event_id: str) -> str:
    """Busca um evento específico pelo ID no Google Calendar."""
    service = _get_service()
    try:
        event = service.events().get(
            calendarId=settings.google_calendar_id,
            eventId=event_id,
        ).execute()
        return json.dumps({
            "event_id": event.get("id"),
            "summary": event.get("summary"),
            "description": event.get("description"),
            "start": event.get("start"),
            "end": event.get("end"),
            "status": event.get("status"),
        })
    except Exception as e:
        return json.dumps({"error": str(e)})


@tool("listar_eventos", args_schema=ListEventsInput)
def list_events_tool(time_min: str, time_max: str) -> str:
    """
    Lista todos os eventos do calendário num intervalo de tempo.
    Use para verificar disponibilidade antes de agendar e para
    buscar agendamentos de um paciente específico.
    """
    service = _get_service()
    try:
        result = service.events().list(
            calendarId=settings.google_calendar_id,
            timeMin=time_min,
            timeMax=time_max,
            singleEvents=True,
            orderBy="startTime",
        ).execute()
        events = result.get("items", [])
        simplified = [
            {
                "event_id": e.get("id"),
                "summary": e.get("summary"),
                "description": e.get("description", ""),
                "start": e.get("start", {}).get("dateTime"),
                "end": e.get("end", {}).get("dateTime"),
            }
            for e in events
        ]
        return json.dumps({"events": simplified, "total": len(simplified)})
    except Exception as e:
        return json.dumps({"error": str(e)})


@tool("deletar_evento", args_schema=DeleteEventInput)
def delete_event_tool(event_id: str) -> str:
    """
    Deleta (cancela) um evento do Google Calendar.
    Sempre delete o evento antigo ANTES de criar o novo ao remarcar.
    """
    service = _get_service()
    try:
        service.events().delete(
            calendarId=settings.google_calendar_id,
            eventId=event_id,
        ).execute()
        return json.dumps({"success": True, "message": f"Evento {event_id} deletado com sucesso."})
    except Exception as e:
        return json.dumps({"success": False, "error": str(e)})
`,
  },
  {
    id: "pinecone_tool",
    title: "tools/pinecone_tool.py",
    filename: "tools/pinecone_tool.py",
    description: "Retriever RAG via Pinecone. Mesmo índice do n8n original. Retorna como LangChain Tool para o agente.",
    language: "python",
    tags: ["tools", "pinecone", "rag", "langchain"],
    code: `"""tools/pinecone_tool.py — RAG via Pinecone (mesmo índice do n8n)."""
from langchain_openai import OpenAIEmbeddings
from langchain_pinecone import PineconeVectorStore
from langchain_core.tools import Tool
from langchain.tools.retriever import create_retriever_tool
from pinecone import Pinecone

from config import settings


def build_pinecone_retriever_tool() -> Tool:
    """
    Cria a tool de recuperação de informações da clínica via Pinecone.

    TRADEOFF — Pinecone vs alternativas:
    ┌──────────────────┬─────────────────────────────────────────┐
    │ Pinecone         │ Mantém o mesmo índice do fluxo n8n.     │
    │ (escolhido)      │ Gerenciado, escalável, API simples.     │
    ├──────────────────┼─────────────────────────────────────────┤
    │ ChromaDB         │ Open-source, local, ótimo para dev.     │
    │                  │ Requer hosting próprio em produção.      │
    ├──────────────────┼─────────────────────────────────────────┤
    │ pgvector         │ PostgreSQL + extensão vetorial.          │
    │                  │ Ideal se já usa Postgres.                │
    ├──────────────────┼─────────────────────────────────────────┤
    │ Qdrant           │ Alta performance, open-source/cloud.     │
    │                  │ Boa opção self-hosted.                   │
    └──────────────────┴─────────────────────────────────────────┘
    """
    pc = Pinecone(api_key=settings.pinecone_api_key)

    embeddings = OpenAIEmbeddings(
        model="text-embedding-3-small",
        api_key=settings.openai_api_key,
    )

    vector_store = PineconeVectorStore(
        index=pc.Index(settings.pinecone_index_name),
        embedding=embeddings,
    )

    retriever = vector_store.as_retriever(
        search_type="similarity",
        search_kwargs={"k": 4},
    )

    return create_retriever_tool(
        retriever=retriever,
        name="dados_clinica",
        description=(
            "Chame essa tool quando for perguntado sobre tratamentos, "
            "procedimentos, informações da clínica ou sobre nós. "
            "Retorna informações detalhadas da base de conhecimento da clínica."
        ),
    )
`,
  },
  {
    id: "think_tool",
    title: "tools/think_tool.py",
    filename: "tools/think_tool.py",
    description: "Tool de raciocínio interno (Think). Permite ao agente refletir antes de agir, equivalente ao nó Think do n8n.",
    language: "python",
    tags: ["tools", "langchain", "reasoning"],
    code: `"""tools/think_tool.py — tool de raciocínio interno (equivalente ao nó Think do n8n)."""
from langchain_core.tools import tool
from pydantic import BaseModel, Field


class ThinkInput(BaseModel):
    thought: str = Field(description="Seu raciocínio interno passo a passo")


@tool("pensar", args_schema=ThinkInput)
def think_tool(thought: str) -> str:
    """
    Use esta tool para pensar passo a passo antes de agir.
    Útil para verificar disponibilidade de horários, validar dados
    do paciente, ou confirmar se uma ação está correta.
    O conteúdo desta tool NÃO é enviado ao paciente.
    """
    # A tool apenas ecoa o raciocínio — o valor está no processo de
    # chain-of-thought que o LLM executa ao chamar esta tool.
    return f"[Raciocínio registrado]: {thought}"
`,
  },
  {
    id: "redis_memory",
    title: "memory/redis_memory.py",
    filename: "memory/redis_memory.py",
    description: "Memória de conversa por sessão (telefone) persistida no Redis. Equivalente ao nó Redis Chat Memory do n8n.",
    language: "python",
    tags: ["memory", "redis", "langchain"],
    code: `"""memory/redis_memory.py — memória de chat por sessão no Redis."""
from langchain_community.chat_message_histories import RedisChatMessageHistory
from langchain.memory import ConversationBufferWindowMemory

from config import settings


async def build_redis_memory(
    session_key: str,
    window_k: int = 20,
) -> ConversationBufferWindowMemory:
    """
    Cria memória de conversa persistida no Redis indexada pelo telefone.

    Equivalente ao nó 'Redis Chat Memory' do n8n com sessionKey = telefone.

    Args:
        session_key: telefone do paciente (ex: "5511999999999")
        window_k: número de turnos de conversa mantidos na janela (20 ≈ 10 trocas)

    Returns:
        ConversationBufferWindowMemory pronto para uso no AgentExecutor.
    """
    history = RedisChatMessageHistory(
        session_id=f"chat:{session_key}",
        url=settings.redis_url,
        ttl=86400 * 7,  # 7 dias de retenção
    )

    memory = ConversationBufferWindowMemory(
        chat_memory=history,
        memory_key="chat_history",
        return_messages=True,
        k=window_k,
        output_key="output",
    )

    return memory
`,
  },
  {
    id: "redis_client",
    title: "services/redis_client.py",
    filename: "services/redis_client.py",
    description: "Cliente Redis assíncrono singleton. Usado para controle de bloqueio do agente e fila de mensagens fracionadas.",
    language: "python",
    tags: ["redis", "services", "async"],
    code: `"""services/redis_client.py — cliente Redis assíncrono (singleton)."""
import redis.asyncio as aioredis
from config import settings

_redis_client: aioredis.Redis | None = None


async def get_redis() -> aioredis.Redis:
    """Retorna (ou cria) o cliente Redis singleton."""
    global _redis_client
    if _redis_client is None:
        _redis_client = aioredis.from_url(
            settings.redis_url,
            encoding="utf-8",
            decode_responses=False,  # bytes — decodificamos manualmente
        )
    return _redis_client


async def close_redis() -> None:
    """Fecha a conexão Redis (chamar no shutdown)."""
    global _redis_client
    if _redis_client:
        await _redis_client.aclose()
        _redis_client = None
`,
  },
  {
    id: "sheets_service",
    title: "services/sheets.py",
    filename: "services/sheets.py",
    description: "Integração com Google Sheets para cadastro de pacientes. Equivalente aos nós Google Sheets (lookup) e Google Sheets1 (append) do n8n.",
    language: "python",
    tags: ["google-sheets", "services"],
    code: `"""services/sheets.py — cadastro de pacientes no Google Sheets."""
import gspread
from google.oauth2 import service_account
from functools import lru_cache

from config import settings
import structlog

log = structlog.get_logger()

SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
]
SHEET_TAB = "Paciente"


@lru_cache(maxsize=1)
def _get_sheet():
    """Retorna a aba 'Paciente' do Google Sheets (cached)."""
    creds = service_account.Credentials.from_service_account_file(
        settings.google_service_account_file,
        scopes=SCOPES,
    )
    gc = gspread.authorize(creds)
    sheet = gc.open_by_key(settings.google_sheets_id)
    return sheet.worksheet(SHEET_TAB)


async def ensure_patient_registered(nome: str, telefone: str) -> bool:
    """
    Verifica se o paciente já está cadastrado pelo telefone.
    Se não estiver, cadastra.

    Equivalente:
      - Google Sheets (lookup por Telefone) → nó If → Google Sheets1 (append)

    Returns:
        True se já existia, False se foi cadastrado agora.
    """
    try:
        ws = _get_sheet()
        # Busca em toda a coluna "Telefone" (coluna B, índice 1)
        records = ws.get_all_records()
        exists = any(
            str(r.get("Telefone", "")) == str(telefone)
            for r in records
        )

        if not exists:
            ws.append_row([nome, telefone])
            log.info("sheets.patient_registered", telefone=telefone, nome=nome)
            return False

        log.info("sheets.patient_exists", telefone=telefone)
        return True

    except Exception as e:
        log.error("sheets.error", error=str(e), telefone=telefone)
        # Não bloqueia o fluxo por falha no Sheets
        return False
`,
  },
  {
    id: "evolution_service",
    title: "services/evolution.py",
    filename: "services/evolution.py",
    description: "Cliente HTTP para a Evolution API (WhatsApp). Envia mensagens e busca mídia em base64. Equivalente aos nós Evolution API e Evolution API1 do n8n.",
    language: "python",
    tags: ["evolution-api", "whatsapp", "services"],
    code: `"""services/evolution.py — cliente Evolution API (WhatsApp)."""
import httpx
from config import settings
import structlog

log = structlog.get_logger()

BASE = settings.evolution_api_base_url.rstrip("/")
INSTANCE = settings.evolution_instance_name
HEADERS = {
    "apikey": settings.evolution_api_key,
    "Content-Type": "application/json",
}


async def send_text_message(telefone: str, texto: str) -> bool:
    """
    Envia mensagem de texto via WhatsApp.
    Equivalente ao nó 'Evolution API1' (messages-api → send text).
    """
    url = f"{BASE}/message/sendText/{INSTANCE}"
    payload = {
        "number": telefone,
        "text": texto,
    }
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(url, json=payload, headers=HEADERS)
            resp.raise_for_status()
            log.info("evolution.message_sent", telefone=telefone, status=resp.status_code)
            return True
    except Exception as e:
        log.error("evolution.send_error", error=str(e), telefone=telefone)
        return False


async def get_media_base64(message_id: str) -> str | None:
    """
    Busca o base64 da mídia (áudio) de uma mensagem.
    Equivalente ao nó 'Evolution API' (chat-api → get-media-base64).
    """
    url = f"{BASE}/chat/getBase64FromMediaMessage/{INSTANCE}"
    payload = {"message": {"key": {"id": message_id}}}
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(url, json=payload, headers=HEADERS)
            resp.raise_for_status()
            data = resp.json()
            return data.get("base64") or data.get("data", {}).get("base64")
    except Exception as e:
        log.error("evolution.media_error", error=str(e), message_id=message_id)
        return None
`,
  },
  {
    id: "audio_service",
    title: "services/audio.py",
    filename: "services/audio.py",
    description: "Transcrição de áudio via OpenAI Whisper. Recebe base64, converte para bytes e transcreve. Equivalente aos nós Convert to File + OpenAI (transcribe) do n8n.",
    language: "python",
    tags: ["openai", "whisper", "audio", "services"],
    code: `"""services/audio.py — transcrição de áudio via OpenAI Whisper."""
import base64
import io
import tempfile
import os

from openai import AsyncOpenAI
from config import settings
import structlog

log = structlog.get_logger()

_openai = AsyncOpenAI(api_key=settings.openai_api_key)


async def transcribe_audio_base64(b64_string: str) -> str:
    """
    Recebe uma string base64 de áudio (mp3/ogg/webm),
    transcreve via OpenAI Whisper e retorna o texto.

    Equivalente aos nós:
      - 'Convert to File' (toBinary base64 → audio.mp3)
      - 'OpenAI' (audio → transcribe)

    Args:
        b64_string: áudio codificado em base64

    Returns:
        Texto transcrito ou string vazia em caso de erro.
    """
    try:
        audio_bytes = base64.b64decode(b64_string)

        # Escreve em arquivo temporário (a API da OpenAI exige file-like object)
        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name

        try:
            with open(tmp_path, "rb") as audio_file:
                transcription = await _openai.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file,
                    language="pt",  # forçar português para melhor precisão
                )
            texto = transcription.text
            log.info("audio.transcribed", chars=len(texto))
            return texto
        finally:
            os.unlink(tmp_path)  # limpa arquivo temporário

    except Exception as e:
        log.error("audio.transcription_error", error=str(e))
        return ""
`,
  },
  {
    id: "confirmation_service",
    title: "services/confirmation.py",
    filename: "services/confirmation.py",
    description: "Serviço de confirmação diária de agendamentos. Busca eventos do próximo dia no Calendar, monta mensagem via LLM e envia via WhatsApp. Equivalente à sub-rede 'Confirmar Agendamento' do n8n.",
    language: "python",
    tags: ["scheduler", "langchain", "google-calendar", "services"],
    code: `"""services/confirmation.py — confirmação diária de agendamentos."""
import json
import re
from datetime import datetime, timedelta, timezone

from langchain_openai import ChatOpenAI
from langchain.agents import AgentExecutor, create_openai_tools_agent
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import SystemMessage

from config import settings
from tools.calendar_tools import list_events_tool
from tools.think_tool import think_tool
from services.evolution import send_text_message
from memory.redis_memory import build_redis_memory
import structlog

log = structlog.get_logger()


async def run_daily_confirmations() -> None:
    """
    Disparado todo dia às 09:00 pelo APScheduler.

    Equivalente à sub-rede do n8n:
      Schedule Trigger → AI Agent2 (busca eventos) →
      Split Out → Loop Over Items1 →
      AI Agent1 (monta mensagem) → Evolution API2

    Fluxo:
      1. Busca todos os eventos de amanhã no Google Calendar
      2. Para cada evento, monta mensagem de confirmação via LLM
      3. Envia via WhatsApp
    """
    log.info("confirmations.started")

    # ── 1. Busca eventos de amanhã ─────────────────────────────────────────
    now = datetime.now(timezone.utc)
    tomorrow_start = (now + timedelta(days=1)).replace(
        hour=0, minute=0, second=0, microsecond=0
    ).isoformat()
    tomorrow_end = (now + timedelta(days=1)).replace(
        hour=23, minute=59, second=59, microsecond=0
    ).isoformat()

    try:
        raw_result = list_events_tool.invoke({
            "time_min": tomorrow_start,
            "time_max": tomorrow_end,
        })
        data = json.loads(raw_result)
        events = data.get("events", [])
    except Exception as e:
        log.error("confirmations.fetch_error", error=str(e))
        return

    if not events:
        log.info("confirmations.no_events_tomorrow")
        return

    log.info("confirmations.events_found", count=len(events))

    # ── 2. Para cada evento, extrai dados e envia confirmação ──────────────
    for event in events:
        try:
            await _send_confirmation(event)
        except Exception as e:
            log.error("confirmations.event_error",
                      event_id=event.get("event_id"),
                      error=str(e))


async def _send_confirmation(event: dict) -> None:
    """
    Monta e envia mensagem de confirmação para um evento.
    Equivalente: AI Agent1 + Evolution API2 do n8n.
    """
    summary = event.get("summary", "")
    description = event.get("description", "")
    start = event.get("start", "")

    # Extrai telefone da descrição do evento
    telefone = _extract_telefone(description)
    if not telefone:
        log.warning("confirmations.no_phone", summary=summary)
        return

    # Extrai nome e médico do summary
    # Padrão esperado: "Nome Paciente - HH:MM - Dr. Nome"
    partes = [p.strip() for p in summary.split("-")]
    nome = partes[0] if len(partes) >= 1 else "Paciente"
    medico = partes[-1] if len(partes) >= 3 else "Médico"

    # Formata horário
    horario = _format_time(start)

    # Monta mensagem de confirmação (sem LLM — texto fixo para garantir padrão)
    mensagem = (
        f"Confirmação de Consulta\\n\\n"
        f"Olá, {nome}. Gostaria de confirmar o agendamento de sua consulta "
        f"com {medico}, para amanhã às {horario}.\\n\\n"
        f"Posso confirmar?"
    )

    log.info("confirmations.sending", telefone=telefone, nome=nome, horario=horario)
    await send_text_message(telefone=telefone, texto=mensagem)


def _extract_telefone(description: str) -> str | None:
    """Extrai telefone da descrição do evento via regex."""
    # Tenta padrões: "Telefone: 5511999999999" ou só o número
    patterns = [
        r"[Tt]elefone[:\\s]+([\\d]{10,15})",
        r"(55\\d{10,11})",
        r"(\\d{10,11})",
    ]
    for pat in patterns:
        match = re.search(pat, description)
        if match:
            return match.group(1)
    return None


def _format_time(iso_string: str) -> str:
    """Converte ISO 8601 para HH:MM."""
    try:
        dt = datetime.fromisoformat(iso_string.replace("Z", "+00:00"))
        # Converte para Brasília (UTC-3)
        dt_br = dt.astimezone(timezone(timedelta(hours=-3)))
        return dt_br.strftime("%H:%M")
    except Exception:
        return iso_string
`,
  },
  {
    id: "ingestion",
    title: "scripts/ingest_documents.py",
    filename: "scripts/ingest_documents.py",
    description: "Script de ingestão de documentos no Pinecone. Equivalente à sub-rede 'Consultar Arquivos' do n8n (Google Drive → Loop → Pinecone Vector Store).",
    language: "python",
    tags: ["pinecone", "rag", "ingestion", "scripts"],
    code: `"""
scripts/ingest_documents.py

Ingesta documentos da pasta local (ou Google Drive) no Pinecone.
Equivalente à sub-rede do n8n:
  Manual Trigger → Google Drive (list) → Google Drive1 (download) →
  Loop Over Items → Pinecone Vector Store (insert) ← Embeddings OpenAI ← Default Data Loader

USO:
    python scripts/ingest_documents.py --folder ./docs/clinica

    # Ou com Google Drive:
    python scripts/ingest_documents.py --drive-folder-id 1F72KQRyxYyysngWgjOpkZVtFOtISAFwt
"""
import argparse
import os
import sys
import tempfile
from pathlib import Path

from langchain_community.document_loaders import (
    PyPDFLoader,
    Docx2txtLoader,
    TextLoader,
    UnstructuredFileLoader,
)
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from langchain_pinecone import PineconeVectorStore
from pinecone import Pinecone

# Adiciona raiz ao path
sys.path.insert(0, str(Path(__file__).parent.parent))
from config import settings


def load_document(path: str):
    """Carrega documento conforme extensão."""
    ext = Path(path).suffix.lower()
    loaders = {
        ".pdf": PyPDFLoader,
        ".docx": Docx2txtLoader,
        ".txt": TextLoader,
        ".md": TextLoader,
    }
    loader_cls = loaders.get(ext, UnstructuredFileLoader)
    return loader_cls(path).load()


def ingest_local_folder(folder: str) -> int:
    """Ingesta todos os documentos de uma pasta local."""
    pc = Pinecone(api_key=settings.pinecone_api_key)
    embeddings = OpenAIEmbeddings(
        model="text-embedding-3-small",
        api_key=settings.openai_api_key,
    )
    vector_store = PineconeVectorStore(
        index=pc.Index(settings.pinecone_index_name),
        embedding=embeddings,
    )
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=100,  # mesmo valor do n8n
    )

    total = 0
    for file_path in Path(folder).rglob("*"):
        if file_path.is_file() and file_path.suffix.lower() in {
            ".pdf", ".docx", ".txt", ".md"
        }:
            print(f"  Processando: {file_path.name}")
            try:
                docs = load_document(str(file_path))
                chunks = splitter.split_documents(docs)
                vector_store.add_documents(chunks)
                total += len(chunks)
                print(f"    → {len(chunks)} chunks inseridos")
            except Exception as e:
                print(f"    ✗ Erro: {e}")

    return total


def ingest_from_google_drive(folder_id: str) -> int:
    """
    Baixa arquivos do Google Drive e ingesta no Pinecone.
    Equivalente: Google Drive (list files) → Google Drive1 (download) → Pinecone
    """
    from googleapiclient.discovery import build
    from googleapiclient.http import MediaIoBaseDownload
    from google.oauth2 import service_account
    import io

    creds = service_account.Credentials.from_service_account_file(
        settings.google_service_account_file,
        scopes=["https://www.googleapis.com/auth/drive.readonly"],
    )
    drive_service = build("drive", "v3", credentials=creds)

    # Lista arquivos da pasta
    query = f"'{folder_id}' in parents and trashed=false"
    result = drive_service.files().list(
        q=query,
        fields="files(id, name, mimeType)",
    ).execute()
    files = result.get("files", [])

    print(f"Encontrados {len(files)} arquivos no Google Drive")

    total = 0
    with tempfile.TemporaryDirectory() as tmpdir:
        for f in files:
            file_id = f["id"]
            name = f["name"]
            print(f"  Baixando: {name}")

            try:
                request = drive_service.files().get_media(fileId=file_id)
                tmp_path = os.path.join(tmpdir, name)
                with open(tmp_path, "wb") as fh:
                    downloader = MediaIoBaseDownload(fh, request)
                    done = False
                    while not done:
                        _, done = downloader.next_chunk()

                # Ingesta o arquivo baixado
                docs = load_document(tmp_path)
                splitter = RecursiveCharacterTextSplitter(
                    chunk_size=1000, chunk_overlap=100
                )
                chunks = splitter.split_documents(docs)

                pc = Pinecone(api_key=settings.pinecone_api_key)
                embeddings = OpenAIEmbeddings(
                    model="text-embedding-3-small",
                    api_key=settings.openai_api_key,
                )
                vs = PineconeVectorStore(
                    index=pc.Index(settings.pinecone_index_name),
                    embedding=embeddings,
                )
                vs.add_documents(chunks)
                total += len(chunks)
                print(f"    → {len(chunks)} chunks inseridos")

            except Exception as e:
                print(f"    ✗ Erro em {name}: {e}")

    return total


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Ingesta documentos no Pinecone")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--folder", help="Caminho para pasta local de documentos")
    group.add_argument("--drive-folder-id", help="ID da pasta no Google Drive")
    args = parser.parse_args()

    print("=== Iniciando ingestão de documentos ===")
    if args.folder:
        total = ingest_local_folder(args.folder)
    else:
        total = ingest_from_google_drive(args.drive_folder_id)

    print(f"\\n✅ Ingestão concluída! Total de chunks: {total}")
`,
  },
  {
    id: "docker",
    title: "docker-compose.yml",
    filename: "docker-compose.yml",
    description: "Stack Docker completa: aplicação Python + Redis. Pronto para deploy.",
    language: "yaml",
    tags: ["docker", "deploy", "redis"],
    code: `version: "3.9"

services:
  # ── Aplicação Principal ──────────────────────────────────────────────────
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: agente_agendamento
    restart: unless-stopped
    ports:
      - "8000:8000"
    environment:
      - REDIS_URL=redis://redis:6379/0
    env_file:
      - .env
    depends_on:
      redis:
        condition: service_healthy
    volumes:
      - ./credentials:/app/credentials:ro
    networks:
      - agente_net

  # ── Redis ────────────────────────────────────────────────────────────────
  redis:
    image: redis:7-alpine
    container_name: agente_redis
    restart: unless-stopped
    command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - agente_net

volumes:
  redis_data:

networks:
  agente_net:
    driver: bridge
`,
  },
  {
    id: "dockerfile",
    title: "Dockerfile",
    filename: "Dockerfile",
    description: "Dockerfile multi-stage otimizado para produção.",
    language: "dockerfile",
    tags: ["docker", "deploy"],
    code: `FROM python:3.12-slim AS base

# Dependências do sistema
RUN apt-get update && apt-get install -y --no-install-recommends \\
    build-essential \\
    curl \\
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ── Instala dependências Python ──────────────────────────────────────────────
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \\
    && pip install --no-cache-dir -r requirements.txt

# ── Copia código ─────────────────────────────────────────────────────────────
COPY . .

# ── Usuário não-root ─────────────────────────────────────────────────────────
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \\
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
`,
  },
];
