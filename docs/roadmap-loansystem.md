# LoanSystem — AI Context

> Última atualização: Sprint 13 (Parte 1 concluída).

---

# Visão Geral

O **LoanSystem** é um aplicativo Full Stack desenvolvido inicialmente para controlar empréstimos informais.

O projeto evoluiu para um **gerenciador financeiro completo**, permitindo que pequenos credores administrem clientes, empréstimos, parcelas, fluxo de caixa e toda sua organização financeira em um único aplicativo.

A longo prazo, o objetivo é transformar o LoanSystem em um **SaaS Financeiro Mobile First**, oferecendo uma experiência semelhante aos aplicativos bancários modernos.

---

# Objetivo do Produto

O LoanSystem deve permitir que um usuário consiga administrar toda sua vida financeira em um único aplicativo.

O foco deixou de ser apenas controlar empréstimos.

Hoje o sistema controla:

- Clientes
- Empréstimos
- Parcelas
- Recebimentos
- Dashboard Financeiro
- Caixa Pessoal
- Cofre Digital
- Movimentações Financeiras
- Contas
- Reservas
- Metas
- Calendário Financeiro
- Notificações
- Organização Financeira

Toda decisão de arquitetura deve priorizar:

- simplicidade
- velocidade
- confiabilidade
- experiência mobile
- uso diário

---

# Stack

## Frontend

- React
- TypeScript
- Vite
- Tailwind CSS v4
- PrimeReact
- React Router DOM

Estrutura:

```
src/
    components/
    fetch/
    hooks/
    interface/
    pages/
    services/
    ui/
```

Arquitetura baseada em:

- Pages
- Components
- Hooks
- Fetch
- DTOs
- Componentes reutilizáveis

---

## Backend

- Node.js
- Express
- TypeScript
- PostgreSQL
- JWT

Estrutura:

```
api-LoanSystem/

infra/
    init.sql

src/
    controller/
    interface/
    model/
    schemas/
    services/

app.ts
routes.ts
server.ts
```

---

# Princípios de Arquitetura

Sempre seguir estes princípios:

- Um Hook por domínio
- Componentes pequenos
- Responsabilidade única
- DTOs para comunicação
- Controllers sem regra de negócio
- Models contendo regra de negócio
- Reutilização máxima
- Mobile First

Segurança:

- id_usuario SEMPRE obtido pelo JWT
- Nunca confiar em dados enviados pelo frontend
- Nunca receber id_usuario pelo body ou query
- Validação sempre no backend

API:

Sempre preferir filtros por query params.

Exemplo:

```
GET /contas?status=pendente
```

ao invés de

```
GET /contas/pendentes
```

---

# Roadmap

## Sprint 1 — Base Visual do Caixa Pessoal

**Status:** ✅ Concluída

Implementado:

- Estrutura inicial
- DTOs
- Empty States
- Cards
- Grid
- Dashboard integrado

---

## Sprint 2 — Cofre Inteligente

**Status:** ✅ Concluída

Implementado:

- Controle de cédulas
- Persistência
- API
- Hook useCofre
- Atualização otimista
- Segurança por usuário

---

## Sprint 3 — Movimentações Financeiras

**Status:** ✅ Concluída

Implementado:

- Entradas
- Saídas
- Histórico
- Requests
- Hook dedicado
- Atualização automática dos cards

---

## Sprint 4 — Gestão de Contas

**Status:** ✅ Concluída

Implementado:

- CRUD completo
- Pagamentos
- Reservas
- Modal
- Lista
- Hook useContas
- API completa

---

## Sprint 5 — Metas Financeiras

**Status:** ✅ Concluída

Implementado:

- CRUD de metas
- Progresso
- Indicadores
- Integração com Caixa Pessoal

---

## Sprint 6 — Organização Financeira Inteligente

**Status:** ✅ Concluída

O módulo de contas deixou de ser apenas um CRUD.

Agora possui:

- categorias
- prioridades
- recorrência
- tags
- observações
- lembretes
- filtros inteligentes
- dashboard "Hoje"

Indicadores automáticos:

- contas vencendo hoje
- contas atrasadas
- próximas contas
- programadas
- valor reservado

Toda a arquitetura foi pensada para Mobile First.

---

## Sprint 7 — Consolidação da Arquitetura

**Status:** ✅ Concluída

Implementado:

- Padronização do módulo financeiro
- Melhorias internas
- Integração entre frontend e backend
- Refatorações estruturais
- Organização do domínio financeiro

---

## Sprint 8 — Dashboard Inteligente

**Status:** ✅ Concluída

Implementado:

- Indicadores financeiros
- Cards dinâmicos
- Fluxo financeiro
- Resumos automáticos
- Melhor experiência de uso

---

## Sprint 9 — Calendário Financeiro

**Status:** ✅ Concluída

Implementado:

- Visão diária
- Visão semanal
- Visão mensal
- Resumo do mês
- Lista de compromissos
- Filtros
- Integração com contas
- Integração com metas
- Integração com recebimentos

O calendário funciona como uma agenda financeira inteligente, centralizando todos os compromissos financeiros do usuário em uma única tela.

---

## Sprint 10 — Central de Notificações + PWA

**Status:** ✅ Concluída

Implementado:

- Central de notificações
- Badge de notificações
- Página dedicada
- Arquitetura PWA
- Manifest
- Service Worker
- Estrutura para Push Notifications

O sistema agora está preparado para evoluir para notificações locais, push notifications e aplicativo mobile.

---

# Situação Atual

Todo o núcleo funcional do sistema está implementado.

O projeto deixa de ser um sistema administrativo e passa a ser desenvolvido como um produto.

O foco das próximas Sprints não é criar novas funcionalidades.

O foco agora é:

- UX
- UI
- Performance
- Refatoração
- Mobile First
- Experiência Premium

---

# Nova Filosofia do Projeto

O LoanSystem NÃO deve parecer um sistema administrativo.

Ele deve parecer um aplicativo financeiro moderno.

Referências obrigatórias:

- Nubank
- Inter
- Mercado Pago
- PicPay
- C6 Bank

Sempre priorizar:

- poucos cliques
- pouco texto
- muitos componentes visuais
- cartões
- indicadores
- gráficos
- ícones
- badges
- espaço em branco
- simplicidade

Se existir uma escolha entre texto e interface visual, a interface visual deve ser priorizada.

---

# Próximas Sprints

## Sprint 11 — Nova Home (Dashboard Mobile Premium)

**Status:** ✅ Concluída

Objetivo:

Redesenhar completamente a tela inicial do aplicativo.

A Home deverá mostrar apenas as informações realmente importantes.

Inspirada em:

- Nubank
- Inter
- Mercado Pago
- PicPay
- C6

A tela deverá conter:

- Saldo principal
- Dinheiro reservado
- Contas vencendo hoje
- Próximos recebimentos
- Últimas movimentações
- Atalhos rápidos
- Notificações recentes

Tudo organizado por rolagem vertical.

Pouco texto.

Mais cartões.

Mais indicadores.

Mais espaço em branco.

Toda a navegação deve ser confortável utilizando apenas uma mão.

O usuário deve abrir o aplicativo e entender sua situação financeira em menos de cinco segundos.

---

## Sprint 12 — Refatoração Geral & Melhoria UI/UX Mobile First

**Status:** 🔄 Em Andamento

### Objetivos Principais

Realizar uma refatoração profunda no **Frontend** e no **Backend**, garantindo UX Mobile First de ponta, segurança reforçada, alta velocidade de resposta e sincronização em tempo real de todas as movimentações financeiras.

---

### 🎨 Frontend (Mobile-First Experience por Ordem de Prioridade)

Nenhuma funcionalidade nova será criada nesta Sprint; o foco é refatorar e aperfeiçoar a experiência móvel na seguinte fila estrita:

1. **Fila 1 — Módulo de Empréstimos (`/emprestimos`)**: ✅ Concluída
   - Refatoração dos cards de listagem de empréstimos para telas pequenas.
   - Ações rápidas de 1 toque (Registrar Pagamento, Cobrar via WhatsApp, Ver Parcelas).
   - Telas de detalhes e formulários otimizados para digitação rápida em teclado mobile.
   - Indicadores visuais claros para parcelas atrasadas, pendentes e quitadas.
   - Clique no card para navegar diretamente para detalhes do empréstimo.
   - Aba "Histórico (Liquidados)" para visualizar contratos quitados.
   - Barra de progresso sincronizada com `num_parcelas` do contrato.
   - Seleção visual de cliente com `ModalSeletor` reutilizável (busca, avatar, 1 toque).
   - Sincronismo automático com Caixa Pessoal: saída ao criar, entrada ao baixar parcela, estorno ao desfazer.

2. **Fila 2 — Módulo de Clientes (`/clientes`)**: ✅ Concluída
   - Redesign da lista de clientes em formato de cartões de contato mobile (grid responsivo).
   - Badges de status de adimplência/inadimplência (`ADIMPLENTE`, `INADIMPLENTE`, `SEM CONTRATO`).
   - Atalho de 1 toque para criar novo empréstimo direto do card ou perfil do cliente (`/emprestimos/novo?clienteId=ID`).
   - Atalho de 1 toque para contato via WhatsApp direto no card/perfil.
   - Busca em tempo real e chips de filtro por status (`TODOS`, `ADIMPLENTES`, `INADIMPLENTES`, `SEM CONTRATO`).

3. **Fila 3 — Módulo de Caixa Pessoal (`/caixa`)**:
   - Atualização dinâmica instantânea dos resumos de caixa ao realizar qualquer operação.
   - Modais responsivos e formulários rápidos para Entradas, Saídas e Pagamento de Contas.
   - Organização visual por abas acessíveis (Extrato, Contas a Pagar/Receber, Cofre Digital, Metas).

4. **Fila 4 — Demais Funcionalidades (Dashboard, Calendário, Notificações, Perfil)**:
   - **Central de Notificações (`/notificacoes`)**: ✅ Concluída — Redesign Mobile-First inspirado em apps bancários (Itaú/Nubank), busca em tempo real (`termoBusca`), cards de recursos rápidos (iToken, Caixa, Régua de Cobrança WhatsApp) e canais de atendimento ("Precisa de ajuda?" - Chat assistente virtual, WhatsApp direto e Telefones/SAC).
   - Ajustes de layout, responsividade e componentes reutilizáveis no Dashboard, Calendário e Perfil.
   - Padronização de hooks e eliminação de código legado/duplicado.

---

### ⚡ Backend (Segurança, Performance & Central de Movimentações)

1. **Segurança Reforçada**:
   - Validação rigorosa de JWT em 100% dos endpoints.
   - Schema validation via Zod no corpo, params e query params.
   - Garantia de isolamento total de dados por usuário (`id_usuario`).

2. **Performance & Rapidez da API**:
   - Otimização das queries de cálculo de resumo financeiro (`GET /caixa`, saldos, entradas e saídas).
   - Indexação adequada das tabelas no PostgreSQL.
   - Respostas ultrarrápidas (< 50ms) para atualização visual em tempo real no app.

3. **Arquitetura Event-Driven & Central Única de Movimentações**: ✅ Concluído (Fila 1)
   - Centralização do registro automático de movimentações financeiras.
   - **Regra Fundamental**: Qualquer ação no sistema (pagamento de parcela de empréstimo, pagamento de conta, entrada/saída de caixa) gera automaticamente um registro na Central de Movimentações do Dia.
   - Garantia de dinamismo 100% no feed e no saldo do usuário.
   - `id_usuario` extraído exclusivamente do JWT em 100% das operações de empréstimo e parcela.

---

## Sprint 13 — Polimento Final & Resiliência

**Status:** 🔄 Em Andamento (Parte 1 Concluída)

### Parte 1 — DDL Limpo + Resiliência de API Offline & Rota 404 (✅ Concluída)

Implementado:

- **Limpeza e Ajustes do DDL (`init.sql`)**: remoção de dados de seed mock, atualização do `role` padrão para `'credor'`, inclusão da coluna `ativo` na tabela `usuario` e criação da DDL para `caixinha_pessoal`.
- **Página de Erro 404 (`Erro404.tsx`)**: rota catch-all com gradiente e visual mobile-first para URLs inexistentes.
- **Central de Conectividade da API (`ApiStatusContext.tsx` / `BaseRequests.ts`)**: monitoramento global com disparos automáticos de eventos `api:offline` e `api:online` em falhas de rede / status 503/504.
- **Banner de Alerta de Servidor Offline (`Layout.tsx`)**: aviso fixo no topo da aplicação com botão de tentativa de reconexão.
- **Componente de Erro de Conexão (`ErroAPI.tsx`)**: ícone animado, mensagens amigáveis e temporizador regressivo de auto-retry (30s).

### Próximas Partes da Sprint 13

- **Parte 2 — Caixinhas (Estilo Nubank)**: persistência PostgreSQL, endpoints da API, hook `useCaixinhas` com otimismo e UI carrossel.
- **Parte 3 — Dashboard Admin (Gestão de Credores SaaS)**: controle de credores, métricas globais e rotas protegidas `/admin`.

---

# Backlog Futuro

Após concluir a Sprint 13, iniciar apenas quando o produto estiver estável.

- Exportação PDF
- Exportação Excel
- Dashboard Analítico
- Integração WhatsApp Business
- Widgets Android/iOS
- Google Calendar
- Apple Calendar
- Multiempresa
- Multiusuário
- ACL
- Auditoria
- Billing
- Refresh Token
- Rate Limiting
- 2FA
- React Native

---

# Forma de Trabalho

Antes de alterar qualquer código:

1. Entender o estado atual do projeto.
2. Analisar apenas os arquivos necessários.
3. Explicar a solução proposta.
4. Somente depois implementar.

Nunca:

- assumir arquitetura
- gerar código duplicado
- quebrar padrões existentes
- criar componentes desnecessários

Sempre:

- reutilizar componentes
- reutilizar hooks
- manter frontend, backend e banco sincronizados
- pensar em escalabilidade
- pensar em experiência mobile
- manter o código limpo e modular

---

# Commits

Utilizar sempre Conventional Commits.

Mensagens em português.

Exemplos:

```text
feat(caixa-pessoal): adicionar gerenciamento de metas

fix(contas): corrigir cálculo do saldo reservado

refactor(hooks): centralizar lógica de contas

style(dashboard): melhorar responsividade dos cards

docs(contexto): atualizar AI Context
```

Nunca agrupar funcionalidades não relacionadas em um mesmo commit.