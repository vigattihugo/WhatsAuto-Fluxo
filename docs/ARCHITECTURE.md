# Arquitetura Detalhada

## 📐 Visão Geral

WhatsAuto é uma aplicação de **two-tier**:

1. **Frontend** (React + TypeScript): Dashboard interativo de visualização
2. **Backend** (Python + FastAPI): Sistema de automação de agendamentos

Este documento descreve principalmente a arquitetura do **Backend**, que é o core do sistema.

## 🔄 Fluxo de Mensagens

### 1. Entrada via Webhook

```
Evolution API (WhatsApp) 
    ↓ POST /clinica
FastAPI Webhook Handler
    ├─ Valida signature (HMAC)
    ├─ Extrai: name, phone, messageType, fromMe, content
    └─ Enfileira em Redis (RPUSH)
    ↓ Retorna 200 imediatamente
    ↓ (background async task)
    ├─ Aguarda 2 segundos (debounce)
    ├─ Agrupa mensagens múltiplas
    ├─ Verifica se é do usuário (fromMe=true)
    └─ Passa para Agent se não bloqueado
```

### 2. Roteamento de Mensagem

```
FastAPI recebe payload:
├─ messageType === "conversation"?
│   └─ Texto → direto para Agent
├─ messageType === "audioMessage"?
│   ├─ Base64 → WAV/MP3
│   ├─ OpenAI Whisper API
│   └─ Transcrição → Agent
└─ Outros (image, document, etc.)
    └─ Log + ignorar
```

### 3. Bloqueio do Agente

**Problema**: Se o humano responde, a IA não deveria continuar respondendo automaticamente.

**Solução**: Redis flag com TTL

```python
# Quando recebemos fromMe=true (mensagem do humano)
if payload["fromMe"]:
    redis.set(f"BloquearAgente:{phone}", "true", ex=3600)

# No Agent
if redis.get(f"BloquearAgente:{phone}"):
    return "Humano conversando. Aguardando..."
```

### 4. Execução do Agent

```
LangChain AgentExecutor (OpenAI Tools)
├─ System Prompt (português, contexto da clínica)
├─ Chat History (Redis, últimas 10 mensagens)
├─ Tools:
│   ├─ list_calendar_events (agenda)
│   ├─ create_calendar_event (marcar consulta)
│   ├─ search_documents (RAG Pinecone)
│   ├─ check_agent_lock (Redis)
│   ├─ think (raciocínio)
│   └─ send_message (Evolution API)
└─ Loops até [DONE] ou erro
```

### 5. Persistência

```
Redis (Session Store):
├─ chat:{phone} → ConversationBufferWindowMemory (TTL: 7d)
├─ BloquearAgente:{phone} → bool (TTL: 1h)
└─ MensagemPicotada:{phone} → list (TTL: 3s)

Pinecone (Vector Store):
├─ Documentos de política
├─ FAQs da clínica
├─ Procedimentos
└─ Informações de contato

Google Calendar:
└─ Agenda da clínica (read/write)

Google Sheets:
└─ Registro de pacientes (read/append)
```

## 🛠️ Módulos Python

| Módulo | Responsabilidade |
|--------|------------------|
| `main.py` | FastAPI app setup, rotas |
| `webhooks.py` | Recepção de payloads da Evolution API |
| `message_handler.py` | Roteamento (texto, áudio, etc.) |
| `debouncer.py` | Redis queue + message grouping |
| `agent.py` | LangChain AgentExecutor com tools |
| `tools/calendar.py` | 4 Google Calendar tools |
| `tools/documents.py` | RAG search (Pinecone) |
| `tools/evolution.py` | Envio via Evolution API |
| `memory.py` | RedisChatMessageHistory |
| `rag.py` | Document ingestion + embedding |
| `config.py` | Environment + constants |
| `scheduler.py` | APScheduler para confirmações diárias |

## 🔐 Decisões de Segurança

### 1. Validação de Webhook

```python
def validate_webhook(request_body: str, signature: str, secret: str) -> bool:
    computed_sig = hmac.new(
        secret.encode(),
        request_body.encode(),
        hashlib.sha256
    ).hexdigest()
    return secrets.compare_digest(computed_sig, signature)
```

### 2. Isolamento por Sessão

- Cada sessão (telefone) tem seu próprio namespace em Redis
- Chat history é isolado
- Agent lock é por sessão

### 3. Rate Limiting

```python
# Sugestão: implementar limiter de X mensagens/minuto por sessão
from slowapi import Limiter
limiter = Limiter(key_func=get_phone_from_request)

@app.post("/clinica")
@limiter.limit("10/minute")
async def webhook(request: Request):
    ...
```

## 📊 Escalabilidade

### Horizontal Scaling

```
LB (nginx)
    ├─ Worker 1 (FastAPI)
    ├─ Worker 2 (FastAPI)
    ├─ Worker 3 (FastAPI)
    └─ Worker N (FastAPI)
            ↓ compartilham
    Redis Cluster (cache/queue)
    Pinecone (managed)
    Google APIs (rate-limited mas escalável)
```

### Performance

- **Webhook latência**: <200ms (retorna 200 imediatamente)
- **Background processing**: assíncrono (não bloqueia)
- **Redis TTL**: evita memória infinita
- **Debounce**: agrupa mensagens, reduz chamadas ao LLM

## 🔄 CI/CD Pipeline

```
Git Push
    ↓
GitHub Actions
    ├─ Lint + Format (black, ruff)
    ├─ Testes unitários
    ├─ Type check (mypy)
    ├─ Build Docker image
    ├─ Push para registry
    └─ Deploy (k8s / ECS / Cloud Run)
```

## 📝 Variáveis de Ambiente

Veja `.env.example` no root do repositório Python. Exemplos:

```bash
OPENAI_API_KEY=sk-...
REDIS_URL=redis://localhost:6379/0
PINECONE_API_KEY=...
EVOLUTION_API_BASE_URL=https://seu-servidor.com
GOOGLE_SERVICE_ACCOUNT_FILE=credentials/google.json
EVOLUTION_INSTANCE_NAME=PensandoAI
```

## 🧪 Teste Local

```bash
# 1. Start Redis
docker run -p 6379:6379 redis:latest

# 2. Setup Python environment
python -m venv venv
source venv/bin/activate  # ou `venv\Scripts\activate` no Windows
pip install -r requirements.txt

# 3. Copy .env
cp .env.example .env
# Preencha com suas chaves

# 4. Run uvicorn
uvicorn main:app --reload --port 8000

# 5. Teste webhook (em outro terminal)
curl -X POST http://localhost:8000/clinica \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "5511987654321",
    "message": "Olá, quero marcar uma consulta",
    "messageType": "conversation",
    "fromMe": false
  }'
```

## 🚀 Deploy em Produção

### Docker

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Docker Compose

```yaml
version: "3.9"
services:
  api:
    build: .
    ports:
      - "8000:8000"
    environment:
      REDIS_URL: redis://redis:6379/0
    depends_on:
      - redis

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

### Cloud Platforms

- **Google Cloud Run**: Fazer deploy do container, configure env vars
- **AWS ECS**: ECR + ECS task + ALB
- **Heroku**: `Procfile` + buildpack Python
- **DigitalOcean**: App Platform ou Droplet com Docker

## 📊 Monitoramento

### Métricas Importantes

- **Latência de webhook**: P95 < 100ms
- **Tempo de Agent execution**: P99 < 5s
- **Taxa de erro**: < 0.1%
- **Redis memory**: monitorar crescimento
- **OpenAI API calls**: custo/dia
- **Pinecone**: query latency, storage

### Logs

```python
import structlog

logger = structlog.get_logger()

logger.info("webhook_received", phone=phone, message_type=type)
logger.error("agent_error", error=e, phone=phone)
```

## 🔗 Integrações Externas

| Serviço | Uso | Crítico? |
|---------|-----|----------|
| OpenAI API | LLM + Whisper | ✅ Sim |
| Google Calendar | Agenda | ✅ Sim |
| Google Sheets | BD pacientes | ⚠️ Sim (fallback?) |
| Pinecone | RAG | ⚠️ Não (graceful degradation) |
| Evolution API | WhatsApp | ✅ Sim |
| Redis | Cache/Queue | ✅ Sim |

## 🚨 Troubleshooting

### Agent não responde

1. Verificar Redis: `redis-cli ping`
2. Verificar bloqueio: `redis-cli get BloquearAgente:5511987654321`
3. Verificar logs: `docker logs whatsauto-api`
4. Verificar quota OpenAI: https://platform.openai.com/account/usage

### Webhook 502 Bad Gateway

1. Uvicorn crash → verificar logs
2. Redis connection lost → reconnect
3. OpenAI timeout → retry logic

### Mensagens duplicadas

1. Redis está persitindo entre restarts
2. Debouncer pode estar com delay < 2s
3. Checar se está enviando múltiplas vezes para Evolution API

---

Para mais detalhes, veja o dashboard interativo em [WhatsAuto Frontend](../README.md).
