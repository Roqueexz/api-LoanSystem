# Implementation Plan — LoanSystem Sprint 13
**Status:** Aguardando aprovação para execução  
**Última atualização:** 2026-08-12

---

## Mudanças Transversais (pré-requisito para todos os planos)

### [MODIFY] `api-LoanSystem/infra/init.sql`

Remover **todos os blocos `INSERT`** de dados mock e seed:
- ❌ `DADOS DE SEED — USUÁRIO ADMIN` (usuário `admin@sistema.com`)
- ❌ `DADOS DE SEED — CLIENTES DE TESTE` (Carlos, Ana, Mariana, Ricardo, Juliana)
- ❌ `DADOS DE SEED — EMPRÉSTIMOS DE TESTE`
- ❌ `DADOS DE SEED — PARCELAS DE TESTE`

O arquivo ficará **apenas com DDL** (CREATE TABLE + índices). Você inserirá o usuário admin diretamente no banco.

Além disso, duas alterações no DDL da tabela `usuario`:
1. Alterar `DEFAULT` de `role` de `'admin'` → `'credor'` (novos usuários já nascem como credores)
2. Adicionar coluna `ativo BOOLEAN NOT NULL DEFAULT TRUE` (para suspensão de credores)

---
---

## PLANO 1 — Página de Erro (API Offline / 404)

### Contexto

Quando `api-LoanSystem` cai, a interface trava em spinners ou erros silenciosos. Não há rota de fallback nem tela de orientação para o usuário.

---

### Arquivos Modificados / Criados

#### [NEW] `src/components/Erros/Erro404.tsx`
Página para rotas inexistentes:
- Número **404** estilizado com gradiente indigo/violet
- Mensagem: *"Página não encontrada"*
- Subtexto: *"O endereço que você tentou acessar não existe."*
- Botão **"Voltar ao Início"** → `navigate('/')`
- Design premium, mobile-first

#### [NEW] `src/components/Erros/ErroAPI.tsx`
Componente visual de servidor offline:
- Ícone animado de servidor (SVG inline + animação CSS `pulse`)
- Título: *"Sistema temporariamente indisponível"*
- Mensagem: *"Não foi possível conectar ao servidor. Tente novamente em instantes."*
- Botão **"Tentar Novamente"** → `window.location.reload()`
- Contador regressivo de 30s com retry automático

#### [NEW] `src/context/ApiStatusContext.tsx`
Context global simples:
```tsx
{ apiOffline: boolean, marcarOffline: () => void, marcarOnline: () => void }
```
Provedor envolvendo o `App.tsx` inteiro.

#### [MODIFY] `src/fetch/BaseRequests.ts`
No bloco `catch` do método `request<T>()`:
- Se `error` for falha de rede (`TypeError: Failed to fetch`) ou status `503`/`504` → chamar `marcarOffline()` via Context ou emitir `CustomEvent('api:offline')`
- Ao receber qualquer resposta bem-sucedida → emitir `CustomEvent('api:online')` para limpar o banner

#### [MODIFY] `src/components/Layout/Layout.tsx`
- Consumir `ApiStatusContext`
- Se `apiOffline === true`: renderizar banner fixo no topo:
  ```
  🔴  Servidor offline — tentando reconectar...   [Tentar agora]
  ```
  Fundo `rose-600`, texto branco, botão de retry

#### [MODIFY] `src/App.tsx`
Adicionar como última rota (catch-all):
```tsx
<Route path="*" element={<Erro404 />} />
```

---

### Arquivos Afetados

| Arquivo | Tipo | Razão |
|---|---|---|
| `src/components/Erros/Erro404.tsx` | NEW | Rota 404 |
| `src/components/Erros/ErroAPI.tsx` | NEW | Componente offline |
| `src/context/ApiStatusContext.tsx` | NEW | Estado global da API |
| `src/fetch/BaseRequests.ts` | MODIFY | Detectar falha de rede |
| `src/components/Layout/Layout.tsx` | MODIFY | Banner offline |
| `src/App.tsx` | MODIFY | Rota `*` catch-all |

---
---

## PLANO 2 — Redesign Caixinhas (Estilo Nubank)

### Contexto

`CaixinhasCard.tsx` inicializa com 3 caixinhas fictícias hardcoded salvas no `localStorage`. Os dados ficam só no cliente — sem persistência real. O redesign move tudo para o PostgreSQL e recria a experiência visual inspirada no Nubank/Inter: scroll horizontal, empty state convidativo, picker de emoji e cor.

---

### Backend

#### [MODIFY] `api-LoanSystem/infra/init.sql`
Nova tabela no DDL (sem dados mock):
```sql
CREATE TABLE IF NOT EXISTS caixinha_pessoal (
    id_caixinha  SERIAL PRIMARY KEY,
    id_usuario   INT           NOT NULL,
    nome         VARCHAR(80)   NOT NULL,
    saldo        NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (saldo >= 0),
    meta         NUMERIC(10,2)          CHECK (meta > 0),
    emoji        VARCHAR(10)            DEFAULT '🐷',
    cor          VARCHAR(60)            DEFAULT 'indigo',
    criado_em    TIMESTAMP              DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_caixinha_usuario
        FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    CONSTRAINT uq_caixinha_usuario_nome
        UNIQUE (id_usuario, nome)
);
CREATE INDEX IF NOT EXISTS idx_caixinha_usuario ON caixinha_pessoal(id_usuario);
```

#### [NEW] `api-LoanSystem/src/schemas/CaixinhaSchema.ts`
```ts
z.object({
  nome: z.string().min(2).max(80),
  meta: z.number().positive().optional(),
  emoji: z.string().max(10).optional(),
  cor: z.string().max(60).optional(),
})
```
Schema de operação (depósito/resgate):
```ts
z.object({ valor: z.number().positive() })
```

#### [NEW] `api-LoanSystem/src/model/Caixinha.ts`
Métodos estáticos, `id_usuario` SEMPRE do JWT:
- `listar(id_usuario)` — `SELECT` todas as caixinhas do usuário
- `criar(id_usuario, dados)` — `INSERT`
- `depositar(id_caixinha, id_usuario, valor)` — `UPDATE saldo = saldo + $valor` verificando propriedade
- `resgatar(id_caixinha, id_usuario, valor)` — `UPDATE saldo = GREATEST(saldo - $valor, 0)` verificando propriedade
- `remover(id_caixinha, id_usuario)` — `DELETE` verificando propriedade

#### [NEW] `api-LoanSystem/src/controller/CaixinhaController.ts`
Métodos: `listar`, `criar`, `depositar`, `resgatar`, `remover`.  
Todos extraem `id_usuario` de `(req as any).usuario.id`.

#### [MODIFY] `api-LoanSystem/src/routes.ts`
```
GET    /api/caixinhas                   Auth → CaixinhaController.listar
POST   /api/caixinhas                   Auth + validate(CaixinhaSchema) → criar
PATCH  /api/caixinhas/:id/depositar     Auth + validate(ValorSchema) → depositar
PATCH  /api/caixinhas/:id/resgatar      Auth + validate(ValorSchema) → resgatar
DELETE /api/caixinhas/:id               Auth → remover
```

---

### Frontend

#### [NEW] `src/fetch/CaixinhaRequests.ts`
Estende `BaseRequests`. Métodos: `listar()`, `criar(dados)`, `depositar(id, valor)`, `resgatar(id, valor)`, `remover(id)`.

#### [NEW] `src/hooks/useCaixinhas.ts`
Hook reativo com atualização otimista:
- Estado: `caixinhas[]`, `carregando`, `erro`
- Ações: `criarCaixinha`, `depositar`, `resgatar`, `remover`
- Otimismo: altera o estado local imediatamente, confirma/reverte conforme a API responder

#### [MODIFY] `src/components/Caixa/CaixaPessoal/CaixinhasCard.tsx`
Redesign completo — **remover** `CAIXINHAS_PADRAO` e todo uso de `localStorage`:

**Estado Vazio (nenhuma caixinha):**
- Emoji 🐷 grande centralizado (animação flutuante CSS)
- Título: *"Nenhuma caixinha ainda"*
- Subtexto: *"Guarde dinheiro por objetivo — viagem, reforma, emergência..."*
- Botão CTA principal: **"+ Criar primeira caixinha"**

**Lista (quando há caixinhas):**
- Scroll horizontal fluído no mobile (tipo carrossel Nubank)
- Cada card (largura fixa ~220px):
  - Emoji no topo (grande, personalizável)
  - Nome do objetivo
  - Saldo em destaque (`R$ 1.200,00`)
  - Barra de progresso animada (gradient emerald → indigo) com % e meta
  - Botões: **Guardar** (verde) / **Resgatar** (neutro)
- Último item do carrossel: card **"+ Nova caixinha"** (borda tracejada)
- Long-press → opção de excluir (confirmar antes)

**Modal Criar Caixinha:**
- Chips de sugestão rápida: `Viagem 🌎` `Reforma 🏠` `Reserva 🛡️` `Carro 🚗` `Investimento 📈` `Outro ✨`
- Grid de picker de emoji (20 emojis financeiros)
- Campo Nome (livre)
- Campo Meta (opcional)
- Picker de cor (6 cores pré-definidas com preview no card)

---

### Arquivos Afetados

| Arquivo | Tipo | Razão |
|---|---|---|
| `infra/init.sql` | MODIFY | DDL da tabela `caixinha_pessoal` |
| `src/schemas/CaixinhaSchema.ts` | NEW | Validação Zod |
| `src/model/Caixinha.ts` | NEW | Queries PostgreSQL |
| `src/controller/CaixinhaController.ts` | NEW | Handlers HTTP |
| `src/routes.ts` | MODIFY | 5 novas rotas |
| `src/fetch/CaixinhaRequests.ts` | NEW | Client HTTP frontend |
| `src/hooks/useCaixinhas.ts` | NEW | Hook reativo com otimismo |
| `src/components/Caixa/CaixaPessoal/CaixinhasCard.tsx` | MODIFY | Redesign visual completo |

---
---

## PLANO 3 — Dashboard Admin (Gestão de Credores SaaS)

### Contexto e Roles

| Role | Quem | Acesso |
|---|---|---|
| `'credor'` | Usuários que usam o LoanSystem para gerenciar empréstimos | Área completa do credor (empréstimos, clientes, caixa, etc.) |
| `'admin'` | Você — dono do sistema | Tudo do credor + Painel Admin em `/admin` |

**Nota:** O `DEFAULT` da coluna `role` muda de `'admin'` para `'credor'`. Seu usuário admin será inserido manualmente no banco com `role = 'admin'`.

---

### Backend

#### [MODIFY] `api-LoanSystem/infra/init.sql`
Alterações na tabela `usuario`:
```sql
-- role padrão agora é 'credor'
role  VARCHAR(20) NOT NULL DEFAULT 'credor'

-- nova coluna para suspensão
ativo BOOLEAN NOT NULL DEFAULT TRUE
```
> Nenhum dado de seed inserido. Você insere o admin manualmente.

#### [NEW] `api-LoanSystem/src/middleware/AdminAuth.ts`
Middleware que lê o JWT e verifica `role === 'admin'`.  
Retorna `403 { mensagem: 'Acesso restrito ao administrador.' }` caso contrário.

#### [MODIFY] `api-LoanSystem/src/middleware/Auth.ts`
Em `verifyToken`, após validar o JWT, verificar se o usuário está ativo consultando o banco:
- `SELECT ativo FROM usuario WHERE id_usuario = $id`
- Se `ativo === false` → `403 { mensagem: 'Conta suspensa. Entre em contato com o administrador.' }`

#### [NEW] `api-LoanSystem/src/model/Admin.ts`
Queries exclusivas do painel admin:

```ts
// Métricas globais do sistema
resumoGlobal(): Promise<{
  totalCredores: number;
  credoresAtivos: number;
  totalClientes: number;
  totalEmprestimos: number;
  volumeTotal: number;
}>

// Lista todos os credores com métricas individuais
listarCredores(): Promise<Array<{
  id_usuario: number;
  nome: string;
  email: string;
  ativo: boolean;
  criado_em: Date;
  total_clientes: number;
  total_emprestimos: number;
  volume_emprestimos: number;
}>>

// Cria um novo credor (role fixo = 'credor')
criarCredor(dados: { nome, email, senha }): Promise<number>

// Suspende (ativo = false)
suspenderCredor(id_usuario: number): Promise<void>

// Reativa (ativo = true)
reativarCredor(id_usuario: number): Promise<void>

// Remove com CASCADE
removerCredor(id_usuario: number): Promise<void>
```

#### [NEW] `api-LoanSystem/src/controller/AdminController.ts`
Handlers: `resumo`, `listarCredores`, `criarCredor`, `suspenderCredor`, `reativarCredor`, `removerCredor`.

#### [MODIFY] `api-LoanSystem/src/routes.ts`
Grupo de rotas protegidas pelo `AdminAuth`:
```
GET    /api/admin/resumo                    → AdminController.resumo
GET    /api/admin/credores                  → AdminController.listarCredores
POST   /api/admin/credores                  → AdminController.criarCredor
PATCH  /api/admin/credores/:id/suspender    → AdminController.suspenderCredor
PATCH  /api/admin/credores/:id/reativar     → AdminController.reativarCredor
DELETE /api/admin/credores/:id              → AdminController.removerCredor
```

---

### Frontend

#### [NEW] `src/fetch/AdminRequests.ts`
Estende `BaseRequests`. Métodos: `resumo()`, `listarCredores()`, `criarCredor(dados)`, `suspenderCredor(id)`, `reativarCredor(id)`, `removerCredor(id)`.

#### [NEW] `src/hooks/useAdmin.ts`
Hook: `credores[]`, `resumoGlobal`, `carregando`, `erro` + ações assíncronas.

#### [NEW] `src/components/Rotas/AdminRoute.tsx`
Componente de rota protegida por role:
```tsx
const role = localStorage.getItem('role');
if (!isAuth || role !== 'admin') return <Navigate to="/" replace />;
return <>{children}</>;
```

#### [NEW] `src/pages/Admin/PAdmin.tsx`
Página da área admin — usa o mesmo `Layout` do credor (mesma nav), sem criar área separada.

#### [NEW] `src/components/Admin/DashboardAdmin.tsx`
Estrutura visual:
```
┌─────────────────────────────────────────┐
│  ⚡ Painel Admin — Gestão de Credores   │
├─────────────────────────────────────────┤
│  [Card] Credores  [Card] Clientes       │
│  [Card] Empréstimos  [Card] Volume R$   │
├─────────────────────────────────────────┤
│  Credores Cadastrados        [+ Novo]   │
│  ┌────────────────────────────────────┐ │
│  │ Avatar | Nome | Email | Clientes   │ │
│  │ Empréstimos | Status | Ações       │ │
│  └────────────────────────────────────┘ │
│  (Mobile: cards empilhados)             │
└─────────────────────────────────────────┘
```

Cards de métricas globais (4):
- Total de Credores Ativos
- Total de Clientes no Sistema
- Total de Empréstimos Ativos
- Volume Financeiro Total (R$)

Lista de credores:
- Mobile: cards individuais (avatar, nome, email, badges de métricas, status Ativo/Suspenso, botões de ação)
- Desktop: tabela com as mesmas informações
- Badges: `Ativo` (verde) / `Suspenso` (vermelho)

#### [NEW] `src/components/Admin/ModalCriarCredor.tsx`
Modal simples: nome, email, senha provisória, confirmação. `POST /api/admin/credores`.

#### [MODIFY] `src/App.tsx`
```tsx
const PAdmin = lazy(() => import('./pages/Admin/PAdmin'));

// Nova rota, após todas as outras:
<Route
  path="/admin"
  element={
    <AdminRoute isAuth={isAuth}>
      <PAdmin />
    </AdminRoute>
  }
/>
```

#### [MODIFY] `src/components/Navegacao/Navegacao.tsx`
Ler `role` do `localStorage`:
```tsx
const role = localStorage.getItem('role');
```
- Se `role === 'admin'`: exibir link **"⚡ Admin"** no desktop nav (com destaque visual diferenciado)
- Para credores: link não aparece

#### [MODIFY] `src/components/Navegacao/MenuDrawer.tsx`
- Adicionar item condicional no `navLinks`:
  ```tsx
  ...(role === 'admin' ? [{ to: '/admin', icon: Zap, label: '⚡ Painel Admin', desc: 'Gestão de credores' }] : [])
  ```

---

### Arquivos Afetados

| Arquivo | Tipo | Razão |
|---|---|---|
| `infra/init.sql` | MODIFY | DEFAULT role → `'credor'`, coluna `ativo`, remover todos os INSERTs |
| `src/middleware/AdminAuth.ts` | NEW | Proteção de rotas admin |
| `src/middleware/Auth.ts` | MODIFY | Verificar `ativo` no token |
| `src/model/Admin.ts` | NEW | Queries do painel admin |
| `src/controller/AdminController.ts` | NEW | Handlers HTTP |
| `src/routes.ts` | MODIFY | 6 novas rotas `/api/admin/*` |
| `src/fetch/AdminRequests.ts` | NEW | Client HTTP frontend |
| `src/hooks/useAdmin.ts` | NEW | Hook admin |
| `src/components/Rotas/AdminRoute.tsx` | NEW | Rota protegida por role |
| `src/pages/Admin/PAdmin.tsx` | NEW | Página admin |
| `src/components/Admin/DashboardAdmin.tsx` | NEW | Dashboard visual |
| `src/components/Admin/ModalCriarCredor.tsx` | NEW | Modal criar credor |
| `src/App.tsx` | MODIFY | Rota `/admin` |
| `src/components/Navegacao/Navegacao.tsx` | MODIFY | Link admin condicional |
| `src/components/Navegacao/MenuDrawer.tsx` | MODIFY | Item admin condicional no drawer |

---

Plano de Implementação — Sprint 13 (PLANO 3: Dashboard Admin & Gestão de Credores)
O objetivo deste plano é implementar a área administrativa do LoanSystem (/admin), permitindo que administradores (role === 'admin') gerenciem todos os credores cadastrados, acompanhem métricas globais da plataforma, adicionem novos credores e suspendam/reativem ou removam acessos.

User Review Required
IMPORTANT

Reforço de Segurança:

Apenas usuários com role = 'admin' no JWT terão permissão para acessar os endpoints /api/admin/* (middleware AdminAuth).
Qualquer credor suspenso (ativo = false) terá seu acesso bloqueado imediatamente na API (middleware Auth consulta a coluna ativo no banco a cada requisição).
No frontend, a rota /admin e o link no menu serão visíveis exclusivamente para administradores.
Proposed Changes
Backend (api-LoanSystem)
[NEW] 
AdminAuth.ts
Middleware para validar se req.usuario.role === 'admin'. Retorna 403 caso contrário.
[MODIFY] 
Auth.ts
Atualizar verifyToken para verificar no banco se o usuário associado ao JWT possui ativo === true.
[NEW] 
Admin.ts
Modelo com consultas SQL para:
resumoGlobal(): métricas gerais (total de credores, ativos, clientes, empréstimos, volume total R$).
listarCredores(): listagem de credores com suas métricas individuais.
criarCredor({ nome, email, senha }): cadastro de credor com hash bcrypt.
suspenderCredor(id_usuario) / reativarCredor(id_usuario).
removerCredor(id_usuario): exclusão com cascata.
[NEW] 
AdminController.ts
Handlers HTTP para as rotas administrativas.
[MODIFY] 
routes.ts
Registrar rotas /api/admin/* protegidas com Auth.verifyToken e AdminAuth.
Frontend (interface-LoanSystem)
[NEW] 
AdminRequests.ts
Cliente HTTP para consumo de /api/admin/*.
[NEW] 
useAdmin.ts
Hook reativo para listar credores, obter estatísticas e executar ações (suspender, reativar, criar, remover).
[NEW] 
AdminRoute.tsx
Guard de rota no React Router DOM garantindo que apenas isAuth && role === 'admin' acesse /admin.
[NEW] 
DashboardAdmin.tsx
Dashboard visual com 4 cards de métricas (Credores, Clientes, Empréstimos, Volume Total), lista responsiva de credores com badges de status (Ativo / Suspenso) e botões de ação rápida.
[NEW] 
ModalCriarCredor.tsx
Modal para cadastro simples de novo credor (nome, email, senha provisória).
[NEW] 
PAdmin.tsx
Página principal da área /admin utilizando a estrutura padrão do Layout.
[MODIFY] 
App.tsx
Adicionar rota /admin protegida por AdminRoute.
[MODIFY] 
Navegacao.tsx
 & 
MenuDrawer.tsx
Exibir o link ⚡ Admin na barra de navegação e menu mobile apenas para usuários com role === 'admin'.
Verification Plan
Automated Tests
Executar npx tsc --noEmit em api-LoanSystem e interface-LoanSystem para assegurar que não haja erros de tipo.
Manual Verification
Segurança de Acesso: Tentar acessar /admin com um usuário credor comum (deve ser redirecionado para a Home).
Dashboard Admin: Acessar /admin com um usuário admin, visualizar métricas globais e lista de credores.
Suspender/Reativar: Suspender um credor e testar fazer requisições com o token desse credor (deve retornar erro 403 Conta Suspensa). Reativá-lo em seguida.
Cadastro de Credor: Adicionar um novo credor pelo modal e verificar se ele aparece imediatamente na listagem.

## Ordem de Execução

```
1. init.sql → remover INSERTs + ajustes DDL (role DEFAULT, coluna ativo, tabela caixinha_pessoal)
   ↓
2. PLANO 1 → Erro 404 e API offline (zero risco, sem banco)
   ↓
3. PLANO 2 → Caixinhas (banco + backend + frontend)
   ↓
4. PLANO 3 → Admin (banco + backend + frontend)
```

---

## Nota de Segurança

> [!IMPORTANT]
> **Coluna `ativo` no middleware:** A verificação se o credor está ativo ou suspenso deve ocorrer no backend a cada requisição (consulta ao banco), **não** somente no frontend — o frontend pode ser manipulado. A validação em `Auth.verifyToken` garante que um credor suspenso não consiga usar a API mesmo com um token JWT ainda válido.

> [!NOTE]
> **Inserindo seu usuário admin manualmente:** Após rodar o `init.sql` limpo, execute no seu banco:
> ```sql
> INSERT INTO usuario (nome, email, senha, role, ativo)
> VALUES ('Seu Nome', 'seu@email.com', 'sua_senha', 'admin', true);
> ```
> O backend fará upgrade automático da senha para bcrypt no primeiro login.
