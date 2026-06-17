import { Router } from "express";
import type { Request, Response } from "express";

// Importação do middleware de Autenticação
import { Auth } from "./middleware/Auth.js"; // Ajuste o caminho da pasta se necessário

const router = Router();

import ClienteController from "./controller/ClienteController.js";
import EmprestimoController from './controller/EmprestimoController.js';

// ============================================
// ROTA INICIAL & AUTENTICAÇÃO
// ============================================
router.get("/api", (req: Request, res: Response) => {
  res.status(200).json({ mensagem: "Olá, boas-vindas a API do OpenLine." });
});

// Rota onde o Front-end faz o POST enviando email e senha para receber o Token JWT
router.post("/api/login", Auth.validacaoUsuario);


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
router.post('/api/emprestimos', Auth.verifyToken, EmprestimoController.cadastrar);
router.put('/api/emprestimos/:id', Auth.verifyToken, EmprestimoController.atualizar);
router.delete('/api/emprestimos/:id', Auth.verifyToken, EmprestimoController.remover);
router.get('/api/emprestimos', Auth.verifyToken, EmprestimoController.todos);
router.get('/api/emprestimos/:id', Auth.verifyToken, EmprestimoController.emprestimo);

export { router };