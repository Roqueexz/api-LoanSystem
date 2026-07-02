import { Router } from "express";
import type { Request, Response } from "express";

const router = Router();

import ClienteController from "./controller/ClienteController.js";
import EmprestimoController from './controller/EmprestimoController.js';
import CaixaController from "./controller/CaixaController.js"; 

// ============================================
// ROTA INICIAL
// ============================================
router.get("/api", (req: Request, res: Response) => {
  res.status(200).json({ mensagem: "Olá, boas-vindas a API do OpenLine." });
});

// ============================================
// ROTAS DE CLIENTES
// ============================================
router.post('/api/clientes', ClienteController.cadastrar);
router.put('/api/clientes/:id', ClienteController.atualizar); 
router.delete('/api/clientes/:id', ClienteController.remover);
router.get('/api/clientes', ClienteController.todos);
router.get('/api/clientes/:id', ClienteController.cliente);

// ============================================
// ROTAS DE EMPRESTIMOS
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