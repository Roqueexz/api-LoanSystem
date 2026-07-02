import { Router } from "express";
import type { Request, Response } from "express";

// Importação do middleware de Autenticação
import { Auth } from "./middleware/Auth.js"; // Ajuste o caminho da pasta se necessário

const router = Router();

import ClienteController from "./controller/ClienteController.js";
import EmprestimoController from './controller/EmprestimoController.js';
import CaixaController from "./controller/CaixaController.js"; 

// ============================================
// ROTA INICIAL & AUTENTICAÇÃO
// ============================================
router.get("/api", (req: Request, res: Response) => {
  res.status(200).json({ mensagem: "Olá, boas-vindas a API do OpenLine." });
});

// ============================================
// ROTAS DE CLIENTES (TODAS PROTEGIDAS)
// ============================================
router.post('/api/clientes', Auth.verifyToken, ClienteController.cadastrar);
router.put('/api/clientes/:id', Auth.verifyToken, ClienteController.atualizar); 
router.delete('/api/clientes/:id', Auth.verifyToken, ClienteController.remover);
router.get('/api/clientes', Auth.verifyToken, ClienteController.todos);
router.get('/api/clientes/:id', Auth.verifyToken, ClienteController.cliente);


// ============================================
// ROTAS DE EMPRESTIMOS (TODAS PROTEGIDAS)
// ============================================
router.post('/api/emprestimos', EmprestimoController.cadastrar);
router.put('/api/emprestimos/:id', EmprestimoController.atualizar);
router.delete('/api/emprestimos/:id', EmprestimoController.remover);
router.get('/api/emprestimos', EmprestimoController.todos);
router.get('/api/emprestimos/:id', EmprestimoController.emprestimo);

// ============================================
// ROTAS DO CAIXA (BALANÇO FINANCEIRO)
// ============================================
router.get('/api/caixa', CaixaController.resumo); 

export { router };