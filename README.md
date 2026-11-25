# Sistema 3D

Controle das solicitações de impressão 3D (prototipagem e produção), da fila única das máquinas e do estoque de filamentos.

Mesma stack do `solicitacao-eng-mecanica`:

| Pasta        | Stack                                                                                   |
| ------------ | --------------------------------------------------------------------------------------- |
| `back-end/`  | Fastify 5 · Prisma 7 (`@prisma/adapter-pg`) · PostgreSQL 16 · Zod 4 · JWT · Swagger      |
| `front-end/` | Vite 7 · React 19 · shadcn/ui (new-york, slate) · Tailwind 4 · React Query · React Router 7 |

## Rodando em desenvolvimento

O Docker sobe **apenas o Postgres**. Back-end e front-end rodam em modo dev.

```bash
# 1) Banco
cd back-end
docker compose up -d            # Postgres em localhost:5436

# 2) Back-end
npm install
npx prisma migrate dev --name init   # 1ª vez: cria a migration e as tabelas
npm run db:seed                      # cria o admin inicial
npm run dev                          # http://localhost:3150  (Swagger: /docs)

# 3) Front-end (outro terminal)
cd front-end
npm install
npm run dev                          # http://localhost:5174
```

**Primeiro acesso:** cartão `0001`, unidade Pedertractor, senha `0001`. A troca de senha é obrigatória.
O cartão do admin inicial pode ser alterado em `SEED_ADMIN_CARD` / `SEED_ADMIN_UNIT` no `.env`.

### Integração com a API da Pedertractor

Preencha `API_PEDERTRACTOR_URL`, `APPNAME` e `APPKEY` no `back-end/.env`. Duas consultas usam a API:

- **Partnumber** (`/part/number/:pn`): valida o partnumber da produção. Sem a API, use `PART_VALIDATION_DISABLED=true` (todo partnumber é aceito).
- **Solicitante** (`/employee/get/:cartao/:unidade`): quem pede produção ou prototipagem se identifica com cartão + unidade; o sistema mostra nome, setor e centro de custo e grava isso na solicitação (o servidor confere de novo ao criar). Sem a API, use `EMPLOYEE_VALIDATION_DISABLED=true` (devolve um colaborador fictício).

## Portas

| Serviço          | Dev                     | Produção (docker)   |
| ---------------- | ----------------------- | ------------------- |
| Postgres         | 5436                    | 5436                |
| API              | 3150                    | 5035                |
| Front            | 5174                    | 5034 (nginx)        |

Produção: `cd back-end && docker compose --profile prod up -d --build`, depois
`cd front-end && VITE_API_URL=http://<host>:5035 docker compose up -d --build`.

## Regras de negócio

**Perfis.** `ADMIN` acessa tudo, inclusive usuários. `OPERATOR` (operador 3D) acessa fila, máquinas, filamentos e itens. Quem faz a solicitação **não precisa de usuário**: as rotas `/solicitacao` e `/acompanhar/:codigo` são públicas.

**Solicitação de produção** (`/solicitacao/producao`):
1. O partnumber é validado na API e são listados os itens **ativos** vinculados a ele.
2. Se não houver item cadastrado, aparece o atalho para pedir via prototipagem.
3. Na **visualização prévia** aparecem: quantas unidades serão produzidas, quantas impressões, quanto filamento é necessário e o prazo. Se faltar filamento, aparece o código ALMX para abrir ordem no almoxarifado.
4. A solicitação já entra como *Aguardando filamento* quando o saldo livre não cobre o consumo.

**Solicitação de prototipagem** (`/solicitacao/prototipagem`): nome, quantidade, filamento (escolhido entre os ativos, com cor e foto), descrição e arquivos auxiliares (foto ou sólido). Depois de **finalizada**, o operador clica em *Registrar item*, informa os parâmetros de impressão e os partnumbers, e o item passa a aparecer para produção.

**Itens.** Um item (plug ou qualquer outra peça impressa) é vinculado a vários partnumbers. Ele guarda:
- gramas por unidade
- minutos por unidade
- unidades por impressão (mesa)

O operador também pode cadastrar itens diretamente na tela *Itens*.

**Filamentos.** Cadastro livre na tela *Filamentos*: tipo (PLA, PETG, TPU…), nome e cor, rígido ou maleável, código ALMX, estoque mínimo e foto. Cada item e cada prototipagem apontam para um filamento; filamentos inativos somem das opções.

**Estoque (em gramas, por filamento):**
- *Saldo*: o que existe fisicamente.
- *Comprometido*: soma das solicitações que estão na fila mas ainda não começaram a imprimir.
- *Livre* = saldo − comprometido. É o valor usado para decidir se uma nova solicitação cabe.
- O débito acontece ao **colocar em impressão** (movimento *Consumo*).
- Uma **falha** baixa o material perdido (movimento *Perda*).
- Uma **entrada** de material libera automaticamente, em ordem de chegada, as solicitações em *Aguardando filamento* que passam a caber no saldo.

**Status das solicitações:** Aguardando impressão (ou prototipagem) · Prototipando · Imprimindo · Falha na impressão · Pausado · Finalizado · Aguardando filamento · Cancelado.

- **Produção:** aguardando → imprimindo → finalizado.
- **Prototipagem:** aguardando → **prototipando** (equipe 3D desenvolvendo o protótipo, ainda sem máquina e sem débito de filamento) → **imprimindo** (ao clicar em "Finalizar prototipagem e imprimir": escolhe a máquina e debita o filamento) → finalizado.

As transições permitidas por tipo ficam em `TRANSITIONS` (back-end `request-service.ts`) e `allowedTransitions` (front `types/domain.ts`).

**Máquinas:** Disponível · Imprimindo · Manutenção · Inativa.
- *Imprimindo* é definido automaticamente ao iniciar uma impressão.
- Quando a solicitação sai de impressão, a máquina volta para *Disponível*.

**Prazo (horas corridas)** = (tempo restante da fila + tempo desta solicitação) ÷ máquinas produtivas (disponíveis + imprimindo).
- Na produção, o tempo de uma solicitação é `ceil(qtd ÷ unidades por impressão) × unidades por impressão × minutos por unidade`.
- Na prototipagem, o operador informa gramas e minutos estimados na aba *Estimativa*.
