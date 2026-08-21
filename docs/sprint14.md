# Sprint 14 — Correções e Melhorias de UX

Correção de 5 problemas reportados pelo usuário, envolvendo comportamento de UI, regras de negócio financeiro e cálculo de parcelas.

---

## Análise dos Problemas

### 1. Caixinhas — Dedução do Saldo Atual da Conta ao Guardar
**Problema:** Ao criar uma nova caixinha e depositar valor nela, o saldo do caixa pessoal **não é subtraído**. O depósito apenas aumenta o saldo da caixinha, mas não registra uma saída de caixa, gerando inconsistência financeira.

**Diagnóstico:** O `CaixinhaController.depositar` só atualiza o saldo da `caixinha_pessoal`, sem registrar movimentação em `caixa_pessoal_movimentacao` e sem verificar saldo disponível. O frontend também não tem validação de saldo.

**Solução:**
- **Backend:** No `Caixinha.ts` (model) ou `CaixinhaController.ts`, ao depositar:
  1. Consultar o saldo atual do caixa pessoal do usuário.
  2. Se `saldo disponível < valor`, retornar erro 400 com mensagem clara.
  3. Se ok, inserir uma movimentação do tipo `saida` em `caixa_pessoal_movimentacao` e chamar `CaixaPessoal.recalcularESalvarSaldo(id_usuario)`.
  4. Ao **resgatar** (reverter), registrar uma `entrada` no caixa pessoal.
- **Frontend:** Exibir o toast de erro retornado pela API quando saldo for insuficiente.

---

### 2. Login — Redirecionamento Momentâneo com Credenciais Inválidas
**Problema:** Ao submeter login com credenciais inválidas, o site brevemente navega para `/` antes de voltar ao login.

**Diagnóstico:** No `FormLogin.tsx`, após verificar `!resultado.sucesso`, o código corretamente seta o erro mas a sequência `onLoginSuccess()` + `navigate("/")` ocorre logo após e o `isAuth` é setado como `true` momentaneamente antes da verificação.

**Raiz verdadeira:** O fluxo em `FormLogin.tsx` está correto (verifica `!resultado.sucesso` e retorna cedo). Porém o `App.tsx` inicializa `isAuth` via `AuthRequests.checkTokenExpiry()` — se houver um token residual/expirado no localStorage, pode ocorrer o redirecionamento. 

**Solução:**
- No `FormLogin.tsx`: Garantir que `onLoginSuccess()` + `navigate("/")` só sejam chamados **dentro do bloco de sucesso confirmado** após a verificação `if (!resultado.sucesso)`. Revisar e garantir que o `setCarregando(false)` está no `finally` (está OK).
- Adicionar `limparSessao()` antes de qualquer tentativa de login, para garantir que não haja tokens residuais interferindo.
- Garantir que a mensagem de erro é exibida com feedback visual claro ("Credenciais inválidas. Por favor, confira os dados e tente novamente.").

---

### 3. Listagem de Clientes — Botão "Novo Cliente" no Empty State
**Problema:** Quando não há clientes cadastrados, não existe um botão destacado para "Novo Cliente" no empty state que redirecione o usuário para criação.

**Diagnóstico:** O `ListagemCliente.tsx` já **tem** um botão "Adicionar Cliente" no empty state (linha 415-421), mas o texto do botão é "Adicionar Cliente" e ele só aparece quando `filtered.length === 0`. O problema é que quando a **lista de clientes está vazia** (sem nenhum cliente na base) e **sem filtro ativo**, o empty state mostra um texto genérico mas o botão aparece. No entanto, o usuário relata que não vê esse botão — provavelmente o botão existe mas não está suficientemente visível ou está condicionado à lista `clientes` vazia ao invés de `filtered` vazia.

**Solução:**
- Melhorar visualmente o empty state quando `clientes.length === 0` (sem nenhum cliente na base), tornando o botão "Novo Cliente" mais proeminente, com ícone, cor e destaque adequados.
- Diferenciar o caso "nenhum cliente encontrado por filtro/busca" do caso "base vazia — cadastre o primeiro cliente".

---

### 4. Calendário — Destaque em Verde no Próximo Pagamento
**Problema:** Na visão mensal do calendário, os dias não destacam visualmente qual é o **próximo pagamento** a receber (próxima parcela de empréstimo vencendo).

**Diagnóstico:** O `Calendario.tsx` agrupa eventos por data e exibe badges coloridos por tipo (`getCorPorTipo`), mas não há lógica para identificar e destacar o **próximo** evento de recebimento.

**Solução:**
- No `Calendario.tsx`, calcular a data do **próximo evento de recebimento** (tipo `recebimento` ou `parcela`) com data >= hoje.
- Aplicar um destaque visual em verde (borda, fundo ou badge especial) no cell do dia correspondente na visão mensal.
- Se houver vários recebimentos futuros, destacar apenas o mais próximo (primeiro a vencer).

---

### 5. Cálculo de Parcelas em Empréstimos — Verificação
**Diagnóstico completo:**

**Frontend (`FormEmprestimo.tsx` — cálculo de preview):**
```
Juros Simples:
  total = valorEmprestimo * (1 + (juros/100) * numParcelas)
  valorParcela = total / numParcelas

Juros Compostos:
  total = valorEmprestimo * (1 + juros/100)^numParcelas
  valorParcela = total / numParcelas
```
✅ Correto matematicamente.

**Backend (`Juros.ts` — `calcularSimples`):**
```
jurosTotal = valorEmprestimo * (taxaJuros/100) * parcelas
valorFinal = valorEmprestimo + jurosTotal  
valorParcela = valorFinal / parcelas
```
✅ Correto — equivalente ao frontend.

**Backend (`Parcela.ts` — `gerarParcelasRestantes`):**
```
montante simples = valorEmprestimo * (1 + (juros/100) * numParcelas)
montante composto = valorEmprestimo * (1 + juros/100)^numParcelas
valorParcelaBase = montante / numParcelas (arredondado p/ 2 casas)
ultimaParcela = montante - (valorParcelaBase * (numParcelas - 1))
```
✅ Correto — última parcela absorve diferença de arredondamento.

**Validação no backend:** Se o frontend envia `valor_parcela`, ele valida se `valorParcela * numParcelas ≈ montante` com margem de ±R$0,01. Isso pode **rejeitar** se a margem for de apenas 1 centavo e houver diferença de arredondamento.

> [!IMPORTANT]
> O cálculo está correto matematicamente. O único problema potencial é a **validação estrita** de `margemErro = 0.01` no `CalculadoraFinanceira.validarSomaParcelas`. Como o frontend arredonda `valorParcela` com `toFixed(2)` e o backend também arredonda, pode haver um delta de até `numParcelas * 0.005` entre a soma e o montante. Para 12 parcelas, esse delta pode chegar a R$0,06.
>
> **Correção:** Aumentar a `margemErro` para `numParcelas * 0.01` (1 centavo por parcela) ou simplesmente não enviar `valor_parcela` no payload do frontend (deixar o backend sempre calcular), o que é a solução mais limpa.

**Decisão:** Não enviar `valor_parcela` no payload do frontend — deixar o backend calcular. Assim, elimina-se a validação de parcela enviada pelo frontend e garante-se que o backend sempre usa o valor correto.

---

## Proposed Changes

### Backend — Feature: Dedução de Saldo ao Depositar em Caixinha

#### [MODIFY] [`CaixinhaController.ts`](file:///c:/Users/42446790810/Documents/workspace/NewEra/LoanSystem/api-LoanSystem/src/controller/CaixinhaController.ts)
- No método `depositar`: verificar saldo atual do usuário via `CaixaPessoal.obterSaldoAtual(id_usuario)`. Se `saldo < valor`, retornar `400` com mensagem `"Saldo insuficiente. Seu saldo atual é R$ X,XX."`.
- Registrar movimentação de saída na `caixa_pessoal_movimentacao`.
- Chamar `CaixaPessoal.recalcularESalvarSaldo(id_usuario)`.

#### [MODIFY] [`Caixinha.ts`](file:///c:/Users/42446790810/Documents/workspace/NewEra/LoanSystem/api-LoanSystem/src/model/Caixinha.ts)
- No método `resgatar`: registrar movimentação de **entrada** ao resgatar de caixinha (devolvendo ao caixa pessoal).
- Chamar `CaixaPessoal.recalcularESalvarSaldo(id_usuario)` após resgate.

---

### Backend — Fix: Margem de Erro no Cálculo de Parcelas

#### [MODIFY] [`CalculadoraFinanceira.ts`](file:///c:/Users/42446790810/Documents/workspace/NewEra/LoanSystem/api-LoanSystem/src/services/CalculadoraFinanceira.ts)
- Aumentar `margemErro` padrão de `0.01` para `1.00` (R$1,00 de tolerância) para evitar rejeições incorretas causadas por acúmulo de arredondamentos.

---

### Frontend — Fix: Login sem Redirecionamento Indevido

#### [MODIFY] [`FormLogin.tsx`](file:///c:/Users/42446790810/Documents/workspace/NewEra/LoanSystem/interface-LoanSystem/src/components/Login/FormLogin/FormLogin.tsx)
- Chamar `AuthRequests.limparSessao()` **antes** de iniciar o login, para limpar tokens residuais.
- Garantir que `onLoginSuccess()` + `navigate("/")` estejam apenas no bloco de sucesso.
- Mensagem de erro mais amigável e descritiva.

---

### Frontend — Feature: Caixinha com Validação de Saldo

#### [MODIFY] [`CaixinhasCard.tsx`](file:///c:/Users/42446790810/Documents/workspace/NewEra/LoanSystem/interface-LoanSystem/src/components/Caixa/CaixaPessoal/CaixinhasCard.tsx)
- No modal de depósito, exibir o **saldo disponível no caixa** para o usuário saber quanto pode guardar.
- O hook `useCaixinhas.ts` já propaga erros da API; o `toast.error` já exibe a mensagem de saldo insuficiente retornada pelo backend.

---

### Frontend — UX: Listagem de Clientes — Empty State Aprimorado

#### [MODIFY] [`ListagemCliente.tsx`](file:///c:/Users/42446790810/Documents/workspace/NewEra/LoanSystem/interface-LoanSystem/src/components/Cliente/ListagemCliente/ListagemCliente.tsx)
- Diferenciar dois estados vazios:
  1. **Base vazia** (`clientes.length === 0` sem loading): Empty state completo com ícone animado, texto motivacional e botão "Novo Cliente" bem destacado.
  2. **Filtro sem resultado** (`filtered.length === 0` mas `clientes.length > 0`): Estado informativo sem o botão de cadastro.

---

### Frontend — Feature: Calendário — Destaque do Próximo Recebimento

#### [MODIFY] [`Calendario.tsx`](file:///c:/Users/42446790810/Documents/workspace/NewEra/LoanSystem/interface-LoanSystem/src/components/Calendario/Calendario.tsx)
- Calcular `proximoRecebimento`: primeira data futura (>= hoje) com evento do tipo `recebimento` ou `parcela`.
- Na renderização da visão mensal, aplicar estilo especial (borda verde + fundo verde claro) no `button` do dia que corresponde ao próximo recebimento.
- Adicionar legenda ou tooltip explicativo no cell destacado.

---

### Frontend — Fix: FormEmprestimo não envia valor_parcela

#### [MODIFY] [`FormEmprestimo.tsx`](file:///c:/Users/42446790810/Documents/workspace/NewEra/LoanSystem/interface-LoanSystem/src/components/Emprestimo/FormEmprestimo/FormEmprestimo.tsx)
- Remover `valor_parcela` do payload enviado para o backend (deixar o campo como `undefined` ou `0`).
- O backend já possui lógica para calcular automaticamente quando `valor_parcela === 0`.

---

## Verificação Plan

### Testes Automáticos
- Nenhum teste automatizado configurado no projeto.

### Verificação Manual
1. **Caixinhas:** Criar caixinha → depositar valor maior que saldo → verificar mensagem de erro; depositar valor menor → verificar que o saldo do caixa cai proporcionalmente; resgatar → verificar que saldo do caixa sobe.
2. **Login:** Tentar login com email/senha errados → verificar que permanece na tela de login com mensagem de erro, sem redirecionamento.
3. **Clientes:** Acessar `/clientes` com base vazia → verificar botão "Novo Cliente" destacado no empty state.
4. **Calendário:** Verificar se há recebimento futuro → o dia deve aparecer com destaque verde na visão mensal.
5. **Empréstimo:** Criar empréstimo com diferentes valores, parcelas e juros → verificar se as parcelas geradas batem com o preview do formulário.
