Relatório de Investigação Técnica — LoanSystem (Sprint 13 / Multiusuário)
Investigação concluída sem alterações no código. Comparei a documentação (roadmap-loansystem.md, sprint13.md) com a implementação real.

Resumo executivo
Item	Conclusão
Causa raiz do erro 23502
Migração incompleta do módulo Cliente (e parcialmente Empréstimo/Caixa) para multiusuário
JWT do novo credor
Funciona corretamente — contém id, login persiste id_usuario no localStorage
Cadastro do credor pelo admin
Correto — cria usuario com role='credor', ativo=true, senha bcrypt
Problema /caixa
Não compartilha a mesma causa raiz do erro de cliente; rota deve abrir, mas parte do módulo ignora id_usuario
Risco de segurança
Alto — Cliente, Empréstimo e Caixa (resumo) não isolam dados por credor
A. Causa raiz
O Sprint 12 adicionou cliente.id_usuario NOT NULL no banco (init.sql), mas o código de Cliente nunca foi atualizado para:

Extrair o usuário autenticado do JWT no controller
Incluir id_usuario no INSERT
Filtrar listagens/consultas por id_usuario
O erro PostgreSQL 23502 ocorre porque o INSERT omite id_usuario; sem valor nem default, o banco tenta NULL em coluna NOT NULL.

Não é falha de login, JWT ausente ou cadastro incorreto do credor pelo painel admin.

B. Fluxo atual (comprovado no código)
Autenticação
POST /api/login
  ↓
Auth.validacaoUsuario()          → Usuario.validarSenha(email, senha)
  ↓
Admin.criarCredor (credor novo)  → INSERT usuario (role='credor', ativo=true) ✅
  ↓
Auth.generateToken(id_usuario)   → JWT payload: { id, nome, email, role }   ✅
  ↓
Resposta login                   → { token, usuario: { id_usuario, nome, email, role } } ✅
  ↓
Frontend AuthRequests            → localStorage: token, idUsuario, role, isAuth ✅
  ↓
Requisições autenticadas         → Header x-access-token
  ↓
Auth.verifyToken                 → jwt.verify → req.usuario = { id, nome, email, role, exp } ✅
  ↓
Checagem ativo no DB             → Usuario.buscarPorId(id) → 403 se suspenso ✅
Convenção de nomes (inconsistente, mas funcional nos módulos migrados):

Camada	Campo do ID
JWT payload
id
Resposta login / DB
id_usuario
req.usuario (middleware)
id
localStorage (frontend)
idUsuario
Módulos que já usam (req as any).usuario.id: CaixaPessoal, Caixinha, Notificação, Calendário, Usuario, Emprestimo (parcial), Parcela (parcial).

Módulo Cliente: não lê req.usuario em nenhum método.

Cadastro de cliente (fluxo que falha)
FormCliente.tsx
  ↓ POST body: { nome_cliente, sobrenome_cliente, telefone, cidade, estado }
  (sem id_usuario — correto pela arquitetura)
  ↓
ClienteRequests.enviarFormularioCliente()
  ↓ BaseRequests → x-access-token ✅
  ↓
POST /api/clientes
  ↓ Auth.verifyToken ✅ (JWT válido, req.usuario.id presente)
  ↓ validate(ClienteSchema) ✅
  ↓
ClienteController.cadastrar()     ❌ NÃO lê req.usuario
  ↓
Cliente.cadastrarCliente()
  ↓
INSERT INTO Cliente (nome, sobrenome, telefone, cidade, estado, criado_em)
  -- id_usuario AUSENTE
  ↓
PostgreSQL → 23502 (id_usuario NULL)
Trecho crítico:


Cliente.ts
Lines 131-137
static async cadastrarCliente(cliente: Cliente): Promise<number> {
  try {
    const queryInsertCliente = `
      INSERT INTO Cliente (nome, sobrenome, telefone, cidade, estado, criado_em)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id_cliente;

ClienteController.ts
Lines 59-85
static async cadastrar(req: Request, res: Response) {
  try {
    // ... monta Cliente a partir do body ...
    const id_cliente = await Cliente.cadastrarCliente(novoCliente);
    // req.usuario NUNCA é consultado
Schema do banco:


init.sql
Lines 52-67
CREATE TABLE IF NOT EXISTS cliente (
    id_cliente      INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_usuario      INT          NOT NULL,                -- proprietário do registro
    ...
    CONSTRAINT fk_cliente_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario(id_usuario)
        ON DELETE CASCADE
);
C. Onde o dado é perdido
Local	Esperado	Encontrado
ClienteController.ts → cadastrar()
const idUsuario = (req as any).usuario.id
Variável inexistente — JWT ignorado
Cliente.ts → cadastrarCliente()
INSERT ... (id_usuario, nome, ...)
Coluna ausente no INSERT
PostgreSQL cliente
id_usuario = <id do credor logado>
NULL → erro 23502
Comparando com módulo que funciona (Caixinha — Sprint 13):


CaixinhaController.ts
Lines 17-20
static async criar(req: Request, res: Response): Promise<any> {
  try {
    const { id } = (req as any).usuario;
    const novaCaixinha = await Caixinha.criar(Number(id), req.body);
Conclusão: o id_usuario não é “perdido” no JWT — nunca é lido no fluxo de Cliente.

D. Relação entre os dois problemas
Erro cliente.id_usuario = NULL
Causa: backend Cliente não implementou multiusuário (Sprint 12 incompleto)
Relacionado ao JWT? Não diretamente — mesmo com JWT correto, o controller não usa
Problema em /caixa
Mesma causa raiz? Não, mas faz parte do mesmo débito arquitetural (migração parcial)
Análise de /caixa:

Aspecto	Status
Rota frontend /caixa
ProtectedRoute só exige isAuth — sem bloqueio por role
Login do novo credor
Deve funcionar (token + localStorage corretos)
Aba Caixa Pessoal
Usa /api/caixa-pessoal/* com req.usuario.id — deve funcionar (estado vazio para credor novo)
Aba Resumo & Fluxo
Usa /api/caixa/* via CaixaController — sem filtro por id_usuario

CaixaController.ts
Lines 7-10
static async resumo(req: Request, res: Response) {
  try {
    const resumoFinanceiro = await Caixa.obterResumoFinanceiro();
    // req.usuario NÃO é usado
Caixa.ts agrega todos empréstimos/parcelas/clientes do sistema — credor novo pode ver dados globais (ex.: do admin) ou zeros, dependendo do banco.

Hipótese descartada: JWT sem id_usuario → JWT usa id (não id_usuario), e está presente.

Hipótese descartada: credor não recebe id_usuario no cadastro → Admin.criarCredor retorna id_usuario corretamente.

Cenários plausíveis para “/caixa não funciona corretamente”:

Aba Resumo mostra dados de outro credor ou vazios de forma confusa
Fluxo quebrado indiretamente (sem clientes, empréstimos não criam, resumo “não faz sentido”)
Aba Caixa Pessoal funciona, mas expectativa era ver fluxo de empréstimos na aba Resumo
E. Impacto para novos credores
Funcionalidade	Status
Login / logout
✅ OK
Painel admin (credor)
N/A
Cadastro de cliente
❌ Quebrado (23502)
Listagem de clientes
⚠️ Retorna todos os clientes (sem filtro)
Cadastro de empréstimo
❌ Provavelmente quebrado — INSERT sem id_usuario
Caixa Pessoal (cofre, movimentações, contas, metas, caixinhas)
✅ OK
Caixa Resumo/Dashboard empréstimos
⚠️ Dados globais, não isolados
Calendário / Notificações
✅ Isolados por id do JWT
Perfil — atividades
⚠️ Query referencia tabela inexistente movimentacao_caixa_pessoal (deveria ser caixa_pessoal_movimentacao)
Empréstimo — mesmo padrão que Cliente:


Emprestimo.ts
Lines 196-201
const query = `
  INSERT INTO Emprestimo (
    id_cliente, valor_emprestimo, num_parcelas, valor_parcela, tipo_juros, juros,
    data_emprestimo, data_devolucao, status_emprestimo, forma_pagamento
  ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
id_usuario é usado só na movimentação de caixa pessoal, não no INSERT de emprestimo — mesma falha 23502 ao tentar criar empréstimo.

F. Solução recomendada
Princípio
Corrigir na origem: extrair id_usuario do JWT no backend e propagar para models/queries. Não permitir NULL em cliente.id_usuario. Não aceitar id_usuario do frontend.

Arquivos a alterar
1. ClienteController.ts
Em cadastrar, todos, cliente, atualizar, remover, resumo: extrair id_usuario de (req as any).usuario.id
Passar id_usuario para o model
Validar ownership em GET/PUT/DELETE por :id
2. Cliente.ts (model)
cadastrarCliente(cliente, id_usuario): incluir id_usuario no INSERT
listarClientes(id_usuario, id_cliente?): WHERE id_usuario = $1 AND status_cliente = TRUE
atualizarCliente, removerCliente, obterResumo: filtrar/validar por id_usuario
3. EmprestimoController.ts + Emprestimo.ts
Incluir id_usuario no INSERT de empréstimo
Filtrar listagens por id_usuario
Validar que id_cliente pertence ao credor logado antes de criar empréstimo
4. CaixaController.ts + Caixa.ts
Passar id_usuario do JWT para todas as queries de resumo/relatórios
Filtrar empréstimos, parcelas e clientes por credor
5. ParcelaController.ts + Parcela.ts (revisão)
Garantir que pagar/desfazer/listar respeitem ownership via join com emprestimo.id_usuario
6. Usuario.ts → atividades()
Corrigir nome da tabela: caixa_pessoal_movimentacao
7. (Opcional) Helper centralizado
Ex.: getIdUsuario(req) para padronizar req.usuario.id vs id_usuario
O que não precisa mudar
Item	Motivo
JWT payload
id já funciona; renomear para id_usuario seria breaking change desnecessária
Schema PostgreSQL
DDL já correto
Cadastro admin de credor
Admin.criarCredor OK
Frontend ClienteRequests
Não deve enviar id_usuario
Auth.ts / AdminAuth.ts
OK para Sprint 13
Frontend
Ajustes mínimos; erros 500 devem sumir após backend
Possível melhoria: mensagens de erro mais claras no cadastro de cliente
Banco de dados
Sem migration destrutiva
Se existirem registros legados sem id_usuario, pode ser necessário script pontual de backfill (fora do escopo imediato se o banco foi recriado com init.sql limpo)
Regressões a testar
Admin continua vendo painel /admin
Credor A não vê clientes/empréstimos do Credor B
Caixa Resumo reflete só dados do credor logado
Caixa Pessoal continua funcionando
Suspensão de credor (ativo=false) continua retornando 403
G. Segurança (isolamento multi-tenant)
Situação atual — risco alto:

Credor A (JWT id=2)
  ↓ GET /api/clientes
  ↓ SELECT * FROM Cliente WHERE status_cliente = TRUE   ← SEM filtro id_usuario
  ↓ Retorna clientes de TODOS os credores
Mesmo padrão em:

Cliente.cliente(id) — busca por ID sem checar ownership
Emprestimo.listarEmprestimos() — sem id_usuario
Caixa.obterResumoFinanceiro() — agregação global
ParcelaController.porEmprestimo() — sem validar se empréstimo pertence ao credor
Módulos com isolamento correto: CaixaPessoal, Caixinha, Notificação, Calendário, rotas Admin.

Um credor mal-intencionado com token válido pode ler e potencialmente alterar dados de outro credor conhecendo IDs — falha grave em sistema financeiro multiusuário.

Plano de implementação em etapas
Etapa 1 — Cliente (prioridade máxima)
Controller extrai id_usuario do JWT
Model inclui id_usuario no INSERT e filtra queries
Ownership em GET/PUT/DELETE/:id
Teste manual: credor novo cadastra cliente com sucesso
Etapa 2 — Empréstimo + Parcela
INSERT com id_usuario
Validar id_cliente pertence ao credor
Listagens filtradas
Parcelas: ownership via empréstimo
Etapa 3 — Caixa (resumo/relatórios)
Propagar id_usuario em CaixaController e Caixa.ts
Alinhar dashboard inteligente e indicadores
Etapa 4 — Hardening
Helper getIdUsuario(req) nos controllers
Corrigir Usuario.atividades()
Revisão de endpoints restantes
Testes: isolamento Credor A vs B, admin, credor suspenso
Etapa 5 — Verificação final
npx tsc --noEmit (api + interface)
Fluxo E2E: admin cria credor → login → cliente → empréstimo → /caixa → caixa pessoal
Documentação vs código
Documentação	Código real
“id_usuario SEMPRE obtido pelo JWT” (roadmap)
✅ CaixaPessoal/Caixinha; ❌ Cliente/Emprestimo/Caixa resumo
Sprint 13 admin/credor OK
✅ Confirmado
Sprint 12 isolamento por usuário
⚠️ DDL sim, código parcial
Conclusão
O erro cliente.id_usuario NULL não vem de JWT inválido ou credor mal cadastrado. Vem de código legado de Cliente (e Empréstimo) não adaptado após o Sprint 12 tornar id_usuario obrigatório no banco.

O problema em /caixa é distinto na causa imediata (rota e Caixa Pessoal devem funcionar), mas relacionado arquiteturalmente: o módulo Caixa de empréstimos ainda opera em escopo global, inadequado para multiusuário.

Aguardo sua autorização para implementar — sugiro começar pela Etapa 1 (Cliente), que desbloqueia o fluxo principal do novo credor.