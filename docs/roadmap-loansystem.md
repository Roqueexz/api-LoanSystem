# LoanSystem — AI Context

> Última atualização: Sprint 10 concluída.

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

**Status:** 🔄 Planejada

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

## Sprint 12 — Refatoração Geral

**Status:** ⏳ Planejada

Objetivo:

Validar toda a arquitetura construída até agora.

Revisar:

- componentes
- hooks
- DTOs
- services
- tipagens
- organização das pastas
- performance
- responsividade
- acessibilidade

Nenhuma funcionalidade nova deverá ser criada nesta Sprint.

---

## Sprint 13 — Polimento Final

**Status:** ⏳ Planejada

Objetivo:

Transformar o sistema em um aplicativo profissional.

Adicionar:

- Skeleton Loading
- Empty States ilustrados
- Micro animações
- Transições suaves
- Melhorias no Dark Mode
- Feedback visual
- Confirmações elegantes
- Melhorias de UX
- Melhorias de acessibilidade
- Revisão completa do fluxo Mobile

Pergunta principal:

> Uma pessoa que nunca utilizou o LoanSystem consegue aprender a usar o aplicativo em menos de cinco minutos?

Se a resposta for não, o fluxo deverá ser redesenhado.

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