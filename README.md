# Fortis360 Capital — Roleta de Leads

Sistema de distribuição automática de leads (roleta round-robin) com controle de ponto para corretores de imóveis.

## Stack

- **Next.js 14** (App Router, TypeScript)
- **PostgreSQL** via Prisma
- **NextAuth** (sessão JWT, login email/senha)
- **Vercel** (deploy + Cron Jobs)
- Fuso horário: **America/Sao_Paulo** (todo `lib/horarios.ts`)

---

## Rodando localmente

### Pré-requisitos

- Node.js 18+
- PostgreSQL (local ou Neon/Supabase)

### 1. Instale as dependências

```bash
npm install
```

### 2. Configure variáveis de ambiente

```bash
cp .env.example .env
# Edite .env com suas credenciais
```

### 3. Configure o banco de dados

```bash
# Aplica o schema
npm run db:push

# Cria o usuário admin inicial
npm run db:seed
```

Credenciais do seed: `admin@fortis360.com` / `Admin@123`

### 4. Inicie o servidor de desenvolvimento

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

---

## Perfis de acesso

| Perfil | Rota principal | Pode fazer |
|--------|---------------|------------|
| **Admin** | `/admin` | CRUD usuários, gerências, roletas, campanhas; logs completos com dados do lead |
| **Gestor de Tráfego** | `/gestor/campanhas` | CRUD campanhas e roletas |
| **Auxiliar** | `/auxiliar` | Painel da roleta, ok geral, remoção manual de corretores |
| **Corretor** | `/corretor` | Marcar presença, manter-online, sair, ver posição na fila |

---

## Webhook de leads

**Endpoint:** `POST /api/webhook/lead`

**Autenticação:** `X-API-KEY: <WEBHOOK_API_KEY>`

**Payload:**
```json
{
  "campanha": "Nome exato da campanha cadastrada",
  "lead": {
    "nome": "João Silva",
    "telefone": "11999999999",
    "email": "joao@email.com"
  }
}
```

**Resposta (200):**
```json
{ "corretor": "Nome do Corretor" }
```
ou
```json
{ "corretor": "Nenhum Corretor Online" }
```

**Erro (422):**
```json
{ "erro": "Campanha não informada ou não cadastrada" }
```

A distribuição usa `SELECT FOR UPDATE SKIP LOCKED` no PostgreSQL — dois webhooks simultâneos nunca designam o mesmo corretor.

---

## Ciclos do dia (horário de Brasília)

| Janela | Evento |
|--------|--------|
| 08h45–09h45 | Entrada manhã |
| 10h00 | Ok geral (auxiliar) → ciclo 10h–12h |
| 11h00–12h00 | Manter-online manhã |
| 12h00 | Corte automático + ok geral → ciclo 12h–15h |
| 13h45–14h45 | Entrada tarde |
| 15h00 | Ok geral (auxiliar) → ciclo 15h–19h |
| 18h00–19h00 | Manter-online tarde |
| 19h00 | Corte automático + ok geral → ciclo 19h–22h |
| 22h00 | Corte geral (todos offline) |

Se o auxiliar não der o ok geral na janela, o sistema constrói a fila automaticamente.

---

## Cron Jobs (Vercel)

Configurados em `vercel.json` (horários em UTC = BRT + 3h):

| Janela BRT | UTC | Endpoint |
|------------|-----|----------|
| 10h | 13:00 | `/api/cron/corte?janela=10h` |
| 12h | 15:00 | `/api/cron/corte?janela=12h` |
| 15h | 18:00 | `/api/cron/corte?janela=15h` |
| 19h | 22:00 | `/api/cron/corte?janela=19h` |
| 22h | 01:00 (dia seguinte) | `/api/cron/corte?janela=22h` |

Os crons são protegidos pelo header `x-cron-secret: <CRON_SECRET>`. A Vercel envia automaticamente este header quando configurado em variável de ambiente.

---

## Deploy na Vercel

1. Importe o repositório na Vercel.
2. Configure as variáveis de ambiente (painel → Settings → Environment Variables).
3. Para a Vercel proteger os crons, defina `CRON_SECRET` na Vercel e ela enviará `x-cron-secret` automaticamente nos requests de cron.
4. Use **Vercel Postgres** ou **Neon** como banco (configure `DATABASE_URL`).
5. Execute as migrações e seed via `vercel env pull && npm run db:push && npm run db:seed`.

---

## Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `DATABASE_URL` | Sim | URL do PostgreSQL |
| `NEXTAUTH_URL` | Sim | URL pública do app (ex: `https://app.vercel.app`) |
| `NEXTAUTH_SECRET` | Sim | Segredo JWT (gerar com `openssl rand -base64 32`) |
| `WEBHOOK_API_KEY` | Sim | Chave de autenticação do webhook de leads |
| `CRON_SECRET` | Sim | Segredo para proteger os endpoints de cron |
| `ALLOW_MANUAL_ADD_OUTSIDE_WINDOW` | Não | Feature flag para adicionar corretor fora da janela (v2, default `false`) |

---

## Estrutura do projeto

```
app/
  api/
    auth/             # NextAuth + troca de senha + reset
    webhook/lead/     # Endpoint de recebimento de leads
    cron/corte/       # Jobs de corte automático
    admin/            # APIs de admin (users, gerências, roletas, campanhas, logs)
    auxiliar/         # APIs do auxiliar (painel, ok-geral, remoção)
    corretor/         # APIs do corretor (presença, manter-online, sair, fila)
  admin/              # Telas do Admin
  gestor/             # Telas do Gestor de Tráfego
  auxiliar/           # Tela do Auxiliar
  corretor/           # Tela do Corretor
lib/
  horarios.ts         # Toda lógica de fuso horário e janelas (centralizada aqui)
  prisma.ts           # Singleton do PrismaClient
  auth.ts             # Helpers de autenticação
services/
  roleta.ts           # Serviço de fila/roleta (núcleo do sistema)
prisma/
  schema.prisma       # Schema completo do banco
  seed.ts             # Seed inicial (admin)
```
