// api/src/routes.ts
import { Router } from "express";
import type { Request, Response } from "express";

import { Auth } from "./middleware/Auth.js";
import { loginLimiter } from './middleware/RateLimiter.js';

import ClienteController from "./controller/ClienteController.js";
import EmprestimoController from './controller/EmprestimoController.js';
import ParcelaController from './controller/ParcelaController.js';
import CaixaController from "./controller/CaixaController.js";
import CaixaPessoalController from "./controller/CaixaPessoalController.js";
import { AuthController } from "./controller/AuthController.js";

import { validate } from "./middleware/Validation.js";
import { ClienteSchema } from "./schemas/ClienteSchema.js";
import { EmprestimoSchema } from "./schemas/EmprestimoSchema.js";
import { LoginSchema } from "./schemas/AuthSchema.js";

const router = Router();
const authController = new AuthController();

// ============================================
// ROTA INICIAL & AUTENTICAÇÃO
// ============================================
router.get("/api", (req: Request, res: Response) => {
  res.status(200).json({ mensagem: "Olá, boas-vindas a API do LoanSystem." });
});

router.post('/api/login', loginLimiter, validate(LoginSchema), authController.login);

// ============================================
// ROTAS DE CLIENTES
// ============================================
router.post('/api/clientes', Auth.verifyToken, validate(ClienteSchema), ClienteController.cadastrar);
router.put('/api/clientes/:id', Auth.verifyToken, validate(ClienteSchema), ClienteController.atualizar);
router.delete('/api/clientes/:id', Auth.verifyToken, ClienteController.remover);
router.get('/api/clientes', Auth.verifyToken, ClienteController.todos);
router.get('/api/clientes/:id/resumo', Auth.verifyToken, ClienteController.resumo);
router.get('/api/clientes/:id', Auth.verifyToken, ClienteController.cliente);

// ============================================
// ROTAS DE EMPRESTIMOS
// ============================================
router.post('/api/emprestimos', Auth.verifyToken, validate(EmprestimoSchema), EmprestimoController.cadastrar);
router.put('/api/emprestimos/:id', Auth.verifyToken, validate(EmprestimoSchema), EmprestimoController.atualizar);
router.delete('/api/emprestimos/:id', Auth.verifyToken, EmprestimoController.remover);
router.get('/api/emprestimos', Auth.verifyToken, EmprestimoController.todos);
router.get('/api/emprestimos/:id', Auth.verifyToken, EmprestimoController.emprestimo);

// ============================================
// ROTAS DE PARCELAS
// ============================================
router.get('/api/emprestimos/:id/parcelas', Auth.verifyToken, ParcelaController.porEmprestimo);
router.get('/api/parcelas/:id', Auth.verifyToken, ParcelaController.parcela);
router.patch('/api/parcelas/:id/pagar', Auth.verifyToken, ParcelaController.pagar);
router.patch('/api/parcelas/:id/desfazer', Auth.verifyToken, ParcelaController.desfazer);

// ============================================
// ROTAS DO CAIXA FINANCEIRO
// ============================================
router.get('/api/caixa', Auth.verifyToken, CaixaController.resumo);
router.get('/api/caixa/diario', Auth.verifyToken, CaixaController.relatorioDiario);
router.get('/api/caixa/mensal', Auth.verifyToken, CaixaController.relatorioMensal);
router.get('/api/caixa/anual', Auth.verifyToken, CaixaController.relatorioAnual);

// ============================================
// ROTAS DO CAIXA PESSOAL
// ============================================
router.get('/api/caixa-pessoal/cofre', Auth.verifyToken, CaixaPessoalController.obterCofre);
router.patch('/api/caixa-pessoal/cofre/:valor_cedula', Auth.verifyToken, CaixaPessoalController.atualizarCedula);

// Sprint 3: Movimentações
router.get('/api/caixa-pessoal/movimentacoes', Auth.verifyToken, CaixaPessoalController.listarMovimentacoes);
router.post('/api/caixa-pessoal/movimentacoes', Auth.verifyToken, CaixaPessoalController.criarMovimentacao);
router.delete('/api/caixa-pessoal/movimentacoes/:id', Auth.verifyToken, CaixaPessoalController.removerMovimentacao);

export { router };