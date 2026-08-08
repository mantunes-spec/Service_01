# Estúdio de Service Design

Aplicação web que apoia o trabalho de um service designer ao longo de todo o
ciclo de um projeto — da definição inicial com o cliente à entrega de blueprints
e mapas de serviço.

Princípios do produto:

- **A IA é assistente, nunca decide sozinha.** Cada função de IA é acionada a
  pedido do utilizador, e todo o output nasce como sugestão (`draft`) que só
  conta depois de **validação humana** (`validated`).
- **Fidelidade ao material.** A análise sintetiza a partir do research
  carregado e cita as fontes; onde falta informação, sinaliza **lacunas** em vez
  de especular.
- **Arquitetura limpa e modular** — separação entre lógica, interface e IA — para
  arrancar como ferramenta interna e poder tornar-se produto depois.

## Fluxo (4 fases sobre o objeto central `Project`)

1. **Definição** — cliente, objetivos e outcomes esperados.
2. **Repositório de research** — upload de ficheiros e texto colado, com
   nomenclatura estável (`citationKey`) e metadados de proveniência.
3. **Análise** — a IA sintetiza temas/insights e identifica lacunas, sob revisão.
4. **Blueprints e mapas** — editor de swimlanes tradicionais (etapas × camadas).

## Estrutura

```
packages/
  shared/     Tipos de domínio partilhados (a "verdade única")
  backend/    Express + Prisma (SQLite) — módulos por fase + camada de IA isolada
  frontend/   React + Vite — uma feature por fase, cliente de API único
```

Detalhe em `packages/backend/src/`:

- `core/` — objeto `Project` (CRUD, navegação de fases)
- `modules/{definition,research,analysis,blueprints}/` — um módulo por fase
- `ai/` — camada de IA isolada: interface `AIProvider`, `MockProvider` (default)
  e `ClaudeProvider` (ligável depois). Trocar de modelo não toca no resto.
- `db/` — cliente Prisma e mapeadores linha↔domínio

## Como correr (desenvolvimento)

Pré-requisito: Node 20+ e um PostgreSQL local.

```bash
npm install

# 1) Postgres local (exemplo com Docker)
docker run --name service01-db -e POSTGRES_PASSWORD=dev -e POSTGRES_DB=service01 -p 5432:5432 -d postgres:16

# 2) configurar ambiente
cp packages/backend/.env.example packages/backend/.env   # ajusta DATABASE_URL se necessário

# 3) criar o schema na base de dados
npm run db:setup

# 4) arrancar backend (:4000) e frontend (:5173)
npm run dev:backend    # num terminal
npm run dev:frontend   # noutro terminal
```

Abre http://localhost:5173. O frontend faz proxy de `/api` para o backend.

### Configuração (`packages/backend/.env`)

Copia `.env.example` para `.env`. Por defeito usa `AI_PROVIDER=mock` (sem custos
nem chave). Para ligar a Claude:

```
AI_PROVIDER=claude
ANTHROPIC_API_KEY=...
ANTHROPIC_MODEL=claude-sonnet-5
```

## Pôr online (deploy no Render)

O repositório inclui um `render.yaml` (Blueprint) que descreve todo o deploy:
um web service (o backend serve também o frontend compilado, no mesmo domínio)
e uma base de dados PostgreSQL gerida.

Passos, pelo dashboard (sem terminal):

1. Cria conta em https://render.com com **Sign in with GitHub** e autoriza acesso
   ao repositório.
2. **New +** → **Blueprint** → escolhe este repositório e a branch.
3. O Render lê o `render.yaml`, mostra o que vai criar → **Apply**.
4. Ao fim de alguns minutos, o web service fica com um URL público. É a app online.
5. Cada `git push` faz redeploy automático.

Notas:
- Em produção o `DATABASE_URL` é injetado a partir da base de dados do Render.
- O Postgres do plano gratuito do Render expira ao fim de ~30 dias; para uso
  contínuo, sobe de plano.
- Uploads de ficheiros vão para disco efémero (perdem-se em cada redeploy).
  Para os manter, adiciona um disco persistente no Render ou migra para object
  storage — o campo `fileRef` já isola o local de armazenamento.

## Escalar depois (decisões deixadas prontas)

- **BD:** SQLite via Prisma → Postgres = trocar `provider`/`DATABASE_URL` no
  schema; os modelos ficam.
- **IA:** nova implementação de `AIProvider`, sem tocar nas rotas nem no frontend.
- **Ficheiros:** hoje em disco local (`storage/`); `fileRef` isola o local de
  armazenamento para trocar por object storage.
- **Multi-utilizador/auth:** a v1 é single-user; o espaço para autenticação fica
  limpo (middleware + relação de owner nos modelos).
