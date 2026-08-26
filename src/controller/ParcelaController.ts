import Parcela from "../model/Parcela.js";
import { type Request, type Response } from "express";
import logger from "../services/Logger.js";
import { isNumeroValido } from "../services/Utilitario.js";
import { DatabaseModel } from "../model/DatabaseModel.js";

const database = new DatabaseModel().pool;

export default class ParcelaController {
  
  private static obterIdUsuario(req: Request): number | null {
    const id = (req as any).usuario?.id;
    if (id === undefined || id === null || !isNumeroValido(Number(id))) {
      return null;
    }
    return Number(id);
  }

  static async porEmprestimo(req: Request, res: Response) {
    try {
      const idUsuario = ParcelaController.obterIdUsuario(req);
      if (idUsuario === null) {
        res.status(401).json({ mensagem: "Usuario nao autenticado." });
        return;
      }

      const id_emprestimo = parseInt(req.params.id as string);
      
      if (!isNumeroValido(id_emprestimo)) {
        res.status(400).json({ mensagem: "ID do emprestimo invalido." });
        return;
      }

      // Verificar se o empréstimo pertence ao usuário
      const checkQuery = `
        SELECT id_emprestimo FROM Emprestimo
        WHERE id_emprestimo = $1 AND id_usuario = $2
      `;
      const checkRes = await database.query(checkQuery, [id_emprestimo, idUsuario]);
      if (checkRes.rows.length === 0) {
        res.status(403).json({ mensagem: "Acesso negado. Este emprestimo nao pertence a este credor." });
        return;
      }

      const parcelas = await Parcela.listarPorEmprestimo(id_emprestimo);

      if (!parcelas || parcelas.length === 0) {
        res.status(204).send();
        return;
      }

      res.status(200).json(parcelas);
    } catch (error) {
      logger.error({ error, id: req.params.id }, "[ParcelaController] Erro ao listar parcelas");
      res.status(500).json({ mensagem: "Erro interno ao listar parcelas." });
    }
  }

  static async parcela(req: Request, res: Response) {
    try {
      const idUsuario = ParcelaController.obterIdUsuario(req);
      if (idUsuario === null) {
        res.status(401).json({ mensagem: "Usuario nao autenticado." });
        return;
      }

      const id = parseInt(req.params.id as string);
      
      if (!isNumeroValido(id)) {
        res.status(400).json({ mensagem: "ID invalido. Informe um numero inteiro positivo." });
        return;
      }

      // Verificar se a parcela pertence ao usuário via JOIN com emprestimo
      const checkQuery = `
        SELECT p.id_parcela FROM Parcela p
        JOIN Emprestimo e ON p.id_emprestimo = e.id_emprestimo
        WHERE p.id_parcela = $1 AND e.id_usuario = $2
      `;
      const checkRes = await database.query(checkQuery, [id, idUsuario]);
      if (checkRes.rows.length === 0) {
        res.status(403).json({ mensagem: "Acesso negado. Esta parcela nao pertence a este credor." });
        return;
      }

      const parcela = await Parcela.buscarPorId(id);
      res.status(200).json(parcela);
    } catch (error: any) {
      logger.error({ error, id: req.params.id }, "[ParcelaController] Erro ao buscar parcela");
      
      if (error.message?.includes("nao encontrada")) {
        res.status(404).json({ mensagem: error.message });
        return;
      }
      res.status(500).json({ mensagem: "Erro interno ao recuperar parcela." });
    }
  }

  static async pagar(req: Request, res: Response) {
  try {
    const idUsuario = ParcelaController.obterIdUsuario(req);
    console.log('[DEBUG] pagar - idUsuario:', idUsuario);
    
    if (idUsuario === null) {
      res.status(401).json({ mensagem: "Usuario nao autenticado." });
      return;
    }

    const id_parcela = parseInt(req.params.id as string);
    console.log('[DEBUG] pagar - id_parcela:', id_parcela);
    
    if (!isNumeroValido(id_parcela)) {
      res.status(400).json({ mensagem: "ID da parcela invalido." });
      return;
    }

    const checkQuery = `
      SELECT p.id_parcela, e.id_usuario 
      FROM Parcela p
      JOIN Emprestimo e ON p.id_emprestimo = e.id_emprestimo
      WHERE p.id_parcela = $1
    `;
    const checkRes = await database.query(checkQuery, [id_parcela]);
    console.log('[DEBUG] pagar - checkRes:', checkRes.rows);
    
    if (checkRes.rows.length === 0) {
      res.status(404).json({ mensagem: "Parcela nao encontrada." });
      return;
    }

    if (checkRes.rows[0].id_usuario !== idUsuario) {
      console.log('[DEBUG] pagar - ownership mismatch. Parcela usuario:', checkRes.rows[0].id_usuario, 'Credor:', idUsuario);
      res.status(403).json({ mensagem: "Acesso negado. Esta parcela nao pertence a este credor." });
      return;
    }

    const dataPagamento = req.body?.data_pagamento
      ? new Date(req.body.data_pagamento)
      : undefined;

    const result = await Parcela.marcarComoPaga(id_parcela, dataPagamento, idUsuario);
    console.log('[DEBUG] pagar - result:', result);

    if (result) {
      res.status(200).json({ mensagem: "Parcela paga com sucesso." });
    } else {
      res.status(404).json({ mensagem: "Parcela nao encontrada." });
    }
  } catch (error) {
    console.error('[DEBUG] pagar - erro:', error);
    logger.error({ error, id: req.params.id }, "[ParcelaController] Erro ao dar baixa na parcela");
    res.status(500).json({ mensagem: "Erro interno ao dar baixa na parcela." });
  }
}
  static async desfazer(req: Request, res: Response) {
    try {
      const idUsuario = ParcelaController.obterIdUsuario(req);
      if (idUsuario === null) {
        res.status(401).json({ mensagem: "Usuario nao autenticado." });
        return;
      }

      const id_parcela = parseInt(req.params.id as string);
      
      if (!isNumeroValido(id_parcela)) {
        res.status(400).json({ mensagem: "ID da parcela invalido." });
        return;
      }

      // Verificar se a parcela pertence ao usuário via JOIN com emprestimo
      const checkQuery = `
        SELECT p.id_parcela FROM Parcela p
        JOIN Emprestimo e ON p.id_emprestimo = e.id_emprestimo
        WHERE p.id_parcela = $1 AND e.id_usuario = $2
      `;
      const checkRes = await database.query(checkQuery, [id_parcela, idUsuario]);
      if (checkRes.rows.length === 0) {
        res.status(403).json({ mensagem: "Acesso negado. Esta parcela nao pertence a este credor." });
        return;
      }

      const result = await Parcela.desfazerPagamento(id_parcela, idUsuario);

      if (result) {
        res.status(200).json({ mensagem: "Pagamento desfeito com sucesso." });
      } else {
        res.status(404).json({ mensagem: "Parcela nao encontrada." });
      }
    } catch (error) {
      logger.error({ error, id: req.params.id }, "[ParcelaController] Erro ao desfazer pagamento");
      res.status(500).json({ mensagem: "Erro interno ao desfazer pagamento." });
    }
  }

  static async listarPorStatus(req: Request, res: Response) {
    try {
      const idUsuario = ParcelaController.obterIdUsuario(req);
      if (idUsuario === null) {
        res.status(401).json({ mensagem: "Usuario nao autenticado." });
        return;
      }

      const { status } = req.query;
      const id_cliente = req.query.id_cliente ? Number(req.query.id_cliente) : undefined;

      if (id_cliente !== undefined && !isNumeroValido(id_cliente)) {
        res.status(400).json({ mensagem: "ID do cliente invalido." });
        return;
      }

      let parcelas: any[] = [];

      if (id_cliente) {
        const lista = await Parcela.listarPorCliente(id_cliente, idUsuario);
        parcelas = lista.map((p: any) => p);
      } else {
        const query = `
          SELECT p.*
          FROM Parcela p
          JOIN Emprestimo e ON p.id_emprestimo = e.id_emprestimo
          WHERE e.status_emprestimo = TRUE AND e.id_usuario = $1
          ORDER BY p.data_vencimento ASC
        `;
        const resDb = await database.query(query, [idUsuario]);
        parcelas = resDb.rows;
      }

      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      let filtradas = parcelas;

      if (status === 'pagas') {
        filtradas = parcelas.filter(p => p.status_parcela === 'PAGA');
      } else if (status === 'pendentes') {
        filtradas = parcelas.filter(p => p.status_parcela === 'pendente');
      } else if (status === 'atrasadas') {
        filtradas = parcelas.filter(p => {
          const vencimento = new Date(p.data_vencimento);
          vencimento.setHours(0, 0, 0, 0);
          return p.status_parcela === 'pendente' && vencimento < hoje;
        });
      }

      res.status(200).json(filtradas);
    } catch (error) {
      logger.error({ error }, "[ParcelaController] Erro ao listar parcelas por status");
      res.status(500).json({ mensagem: "Erro interno ao listar parcelas." });
    }
  }

  static async vencendoNoMes(req: Request, res: Response) {
    try {
      const idUsuario = ParcelaController.obterIdUsuario(req);
      if (idUsuario === null) {
        res.status(401).json({ mensagem: "Usuario nao autenticado." });
        return;
      }

      const mes = req.query.mes ? parseInt(req.query.mes as string) : undefined;
      const ano = req.query.ano ? parseInt(req.query.ano as string) : undefined;

      const parcelas = await Parcela.listarParcelasVencendoNoMes(idUsuario, mes, ano);
      res.status(200).json(parcelas);
    } catch (error) {
      logger.error({ error }, "[ParcelaController] Erro ao listar parcelas vencendo no mes");
      res.status(500).json({ mensagem: "Erro interno ao listar parcelas vencendo no mes." });
    }
  }
}