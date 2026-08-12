// api/src/routes.ts
import { Router } from "express";
import type { Request, Response } from "express";

import { Auth } from "./middleware/Auth.js";
import { upload } from "./middleware/upload.js";
import { loginLimiter } from "./middleware/RateLimiter.js";

import ClienteController from "./controller/ClienteController.js";
import EmprestimoController from "./controller/EmprestimoController.js";
import ParcelaController from "./controller/ParcelaController.js";
import CaixaController from "./controller/CaixaController.js";
import CaixaPessoalController from "./controller/CaixaPessoalController.js";
import CalendarioController from "./controller/CalendarioController.js";
import NotificacaoController from "./controller/NotificacaoController.js";
import { AuthController } from "./controller/AuthController.js";
import UsuarioController from "./controller/UsuarioController.js";
import CaixinhaController from "./controller/CaixinhaController.js";
import AdminController from "./controller/AdminController.js";
import { verifyAdmin } from "./middleware/AdminAuth.js";

import { validate } from "./middleware/Validation.js";
import { ClienteSchema } from "./schemas/ClienteSchema.js";
import { EmprestimoSchema } from "./schemas/EmprestimoSchema.js";
import { LoginSchema } from "./schemas/AuthSchema.js";
import { ContaSchema } from "./schemas/ContaSchema.js";
import { MetaSchema, MetaUpdateSchema } from "./schemas/MetaSchema.js";
import { AtualizarPerfilSchema, AlterarSenhaSchema } from "./schemas/UsuarioSchema.js";
import { CaixinhaSchema, ValorCaixinhaSchema } from "./schemas/CaixinhaSchema.js";

const router = Router();
const authController = new AuthController();

// ============================================
// ROTA INICIAL & AUTENTICAÇÃO
// ============================================
router.get("/api", (req: Request, res: Response) => {
  res.status(200).json({ mensagem: "Olá, boas-vindas a API do LoanSystem." });
});

router.post(
  "/api/login",
  loginLimiter,
  validate(LoginSchema),
  authController.login,
);

// ============================================
// ROTAS DO PERFIL DO USUÁRIO
// ============================================
router.get("/api/usuario/perfil", Auth.verifyToken, UsuarioController.perfil);
router.put(
  "/api/usuario/perfil",
  Auth.verifyToken,
  validate(AtualizarPerfilSchema),
  UsuarioController.atualizarPerfil,
);
router.patch(
  "/api/usuario/senha",
  Auth.verifyToken,
  validate(AlterarSenhaSchema),
  UsuarioController.alterarSenha,
);
router.get("/api/usuario/atividades", Auth.verifyToken, UsuarioController.atividades);
router.put("/api/usuario/avatar", Auth.verifyToken, upload.single('avatar'), UsuarioController.uploadAvatar);

// ============================================
// ROTAS DE CLIENTES
// ============================================
router.post(
  "/api/clientes",
  Auth.verifyToken,
  validate(ClienteSchema),
  ClienteController.cadastrar,
);
router.put(
  "/api/clientes/:id",
  Auth.verifyToken,
  validate(ClienteSchema),
  ClienteController.atualizar,
);
router.delete("/api/clientes/:id", Auth.verifyToken, ClienteController.remover);
router.get("/api/clientes", Auth.verifyToken, ClienteController.todos);
router.get(
  "/api/clientes/:id/resumo",
  Auth.verifyToken,
  ClienteController.resumo,
);
router.get("/api/clientes/:id", Auth.verifyToken, ClienteController.cliente);

// ============================================
// ROTAS DE EMPRESTIMOS
// ============================================
router.post(
  "/api/emprestimos",
  Auth.verifyToken,
  validate(EmprestimoSchema),
  EmprestimoController.cadastrar,
);
router.put(
  "/api/emprestimos/:id",
  Auth.verifyToken,
  validate(EmprestimoSchema),
  EmprestimoController.atualizar,
);
router.delete(
  "/api/emprestimos/:id",
  Auth.verifyToken,
  EmprestimoController.remover,
);
router.get("/api/emprestimos", Auth.verifyToken, EmprestimoController.todos);
router.get(
  "/api/emprestimos/:id",
  Auth.verifyToken,
  EmprestimoController.emprestimo,
);

// ============================================
// ROTAS DE PARCELAS
// ============================================
router.get(
  "/api/emprestimos/:id/parcelas",
  Auth.verifyToken,
  ParcelaController.porEmprestimo,
);
router.get("/api/parcelas/:id", Auth.verifyToken, ParcelaController.parcela);
router.patch(
  "/api/parcelas/:id/pagar",
  Auth.verifyToken,
  ParcelaController.pagar,
);
router.patch(
  "/api/parcelas/:id/desfazer",
  Auth.verifyToken,
  ParcelaController.desfazer,
);

// ============================================
// ROTAS DO CAIXA FINANCEIRO
// ============================================
router.get("/api/caixa", Auth.verifyToken, CaixaController.resumo);
router.get(
  "/api/caixa/diario",
  Auth.verifyToken,
  CaixaController.relatorioDiario,
);
router.get(
  "/api/caixa/mensal",
  Auth.verifyToken,
  CaixaController.relatorioMensal,
);
router.get(
  "/api/caixa/anual",
  Auth.verifyToken,
  CaixaController.relatorioAnual,
);
router.get(
  "/api/caixa/dashboard",
  Auth.verifyToken,
  CaixaController.dashboardInteligente,
);
router.get(
  "/api/caixa/indicadores",
  Auth.verifyToken,
  CaixaController.indicadoresFinanceiros,
);

// ============================================
// ROTAS DO CALENDÁRIO FINANCEIRO
// ============================================
router.get(
  "/api/calendario/eventos",
  Auth.verifyToken,
  CalendarioController.eventos,
);
router.get(
  "/api/calendario/previsualizar",
  Auth.verifyToken,
  CalendarioController.previsualizarMes,
);
router.post(
  "/api/calendario/eventos",
  Auth.verifyToken,
  CalendarioController.criarEvento,
);
router.patch(
  "/api/calendario/regras",
  Auth.verifyToken,
  CalendarioController.atualizarRegra,
);

// ============================================
// ROTAS DE NOTIFICAÇÕES
// ============================================
router.get(
  "/api/notificacoes",
  Auth.verifyToken,
  NotificacaoController.listar,
);
router.get(
  "/api/notificacoes/preferencias",
  Auth.verifyToken,
  NotificacaoController.preferencia,
);
router.patch(
  "/api/notificacoes/preferencias",
  Auth.verifyToken,
  NotificacaoController.atualizarPreferencia,
);
router.patch(
  "/api/notificacoes/:id/ler",
  Auth.verifyToken,
  NotificacaoController.marcarComoLida,
);
router.patch(
  "/api/notificacoes/:id/arquivar",
  Auth.verifyToken,
  NotificacaoController.arquivar,
);

// ============================================
// ROTAS DO CAIXA PESSOAL
// ============================================
router.get(
  "/api/caixa-pessoal/cofre",
  Auth.verifyToken,
  CaixaPessoalController.obterCofre,
);
router.patch(
  "/api/caixa-pessoal/cofre/:valor_cedula",
  Auth.verifyToken,
  CaixaPessoalController.atualizarCedula,
);

// Sprint 3: Movimentações
router.get(
  "/api/caixa-pessoal/movimentacoes",
  Auth.verifyToken,
  CaixaPessoalController.listarMovimentacoes,
);
router.post(
  "/api/caixa-pessoal/movimentacoes",
  Auth.verifyToken,
  CaixaPessoalController.criarMovimentacao,
);
router.delete(
  "/api/caixa-pessoal/movimentacoes/:id",
  Auth.verifyToken,
  CaixaPessoalController.removerMovimentacao,
);

// Sprint 4: Contas e Reservas
router.get(
  "/api/caixa-pessoal/contas",
  Auth.verifyToken,
  CaixaPessoalController.listarContas,
);
router.post(
  "/api/caixa-pessoal/contas",
  Auth.verifyToken,
  validate(ContaSchema),
  CaixaPessoalController.criarConta,
);
router.patch(
  "/api/caixa-pessoal/contas/:id/pagar",
  Auth.verifyToken,
  CaixaPessoalController.pagarConta,
);
router.delete(
  "/api/caixa-pessoal/contas/:id",
  Auth.verifyToken,
  CaixaPessoalController.removerConta,
);

// Sprint 5: Metas Financeiras
router.get(
  "/api/caixa-pessoal/metas",
  Auth.verifyToken,
  CaixaPessoalController.listarMetas,
);
router.post(
  "/api/caixa-pessoal/metas",
  Auth.verifyToken,
  validate(MetaSchema),
  CaixaPessoalController.criarMeta,
);
router.put(
  "/api/caixa-pessoal/metas/:id",
  Auth.verifyToken,
  validate(MetaUpdateSchema),
  CaixaPessoalController.atualizarMeta,
);
router.delete(
  "/api/caixa-pessoal/metas/:id",
  Auth.verifyToken,
  CaixaPessoalController.removerMeta,
);

// Sprint 13: Caixinhas de Reserva
router.get(
  "/api/caixinhas",
  Auth.verifyToken,
  CaixinhaController.listar,
);
router.post(
  "/api/caixinhas",
  Auth.verifyToken,
  validate(CaixinhaSchema),
  CaixinhaController.criar,
);
router.patch(
  "/api/caixinhas/:id/depositar",
  Auth.verifyToken,
  validate(ValorCaixinhaSchema),
  CaixinhaController.depositar,
);
router.patch(
  "/api/caixinhas/:id/resgatar",
  Auth.verifyToken,
  validate(ValorCaixinhaSchema),
  CaixinhaController.resgatar,
);
router.delete(
  "/api/caixinhas/:id",
  Auth.verifyToken,
  CaixinhaController.remover,
);

// Sprint 13: Painel Admin SaaS (Gestão de Credores)
router.get(
  "/api/admin/resumo",
  Auth.verifyToken,
  verifyAdmin,
  AdminController.resumo,
);
router.get(
  "/api/admin/credores",
  Auth.verifyToken,
  verifyAdmin,
  AdminController.listarCredores,
);
router.post(
  "/api/admin/credores",
  Auth.verifyToken,
  verifyAdmin,
  AdminController.criarCredor,
);
router.patch(
  "/api/admin/credores/:id/suspender",
  Auth.verifyToken,
  verifyAdmin,
  AdminController.suspenderCredor,
);
router.patch(
  "/api/admin/credores/:id/reativar",
  Auth.verifyToken,
  verifyAdmin,
  AdminController.reativarCredor,
);
router.delete(
  "/api/admin/credores/:id",
  Auth.verifyToken,
  verifyAdmin,
  AdminController.removerCredor,
);

export { router };

