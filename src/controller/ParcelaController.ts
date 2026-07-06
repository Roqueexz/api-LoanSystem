import Parcela from "../model/Parcela.js";
import databaseInstance from "../model/DatabaseModel.js";
import { type Request, type Response } from "express";
import logger from "../services/Logger.js";
import { isNumeroValido } from "../services/Utilitario.js";

const database = databaseInstance.pool;

export default class ParcelaController {
  static async porEmprestimo(req: Request, res: Response) {
    try {
      const id_emprestimo = parseInt(req.params.id as string);
      
      if (!isNumeroValido(id_emprestimo)) {
        res.status(400).json({ mensagem: "ID do emprestimo invalido." });
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
      const id = parseInt(req.params.id as string);
      
      if (!isNumeroValido(id)) {
        res.status(400).json({ mensagem: "ID invalido. Informe um numero inteiro positivo." });
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
      const id_parcela = parseInt(req.params.id as string);
      
      if (!isNumeroValido(id_parcela)) {
        res.status(400).json({ mensagem: "ID da parcela invalido." });
        return;
      }

      const dataPagamento = req.body?.data_pagamento
        ? new Date(req.body.data_pagamento)
        : undefined;

      const result = await Parcela.marcarComoPaga(id_parcela, dataPagamento);

      if (result) {
        res.status(200).json({ mensagem: "Parcela paga com sucesso." });
      } else {
        res.status(404).json({ mensagem: "Parcela nao encontrada." });
      }
    } catch (error) {
      logger.error({ error, id: req.params.id }, "[ParcelaController] Erro ao dar baixa na parcela");
      res.status(500).json({ mensagem: "Erro interno ao dar baixa na parcela." });
    }
  }

  static async desfazer(req: Request, res: Response) {
    try {
      const id_parcela = parseInt(req.params.id as string);
      
      if (!isNumeroValido(id_parcela)) {
        res.status(400).json({ mensagem: "ID da parcela invalido." });
        return;
      }

      const result = await Parcela.desfazerPagamento(id_parcela);

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
      const { status } = req.query;
      const id_cliente = req.query.id_cliente ? Number(req.query.id_cliente) : undefined;

      // Validar id_cliente se fornecido
      if (id_cliente !== undefined && !isNumeroValido(id_cliente)) {
        res.status(400).json({ mensagem: "ID do cliente invalido." });
        return;
      }

      let parcelas: any[] = [];

      if (id_cliente) {
        const lista = await Parcela.listarPorCliente(id_cliente);
        parcelas = lista.map((p: any) => p);
      } else {
        const query = `
          SELECT p.*
          FROM Parcela p
          JOIN Emprestimo e ON p.id_emprestimo = e.id_emprestimo
          WHERE e.status_emprestimo = TRUE
          ORDER BY p.data_vencimento ASC
        `;
        const resDb = await database.query(query);
        parcelas = resDb.rows;
      }

      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      let filtradas = parcelas;

      if (status === 'pagas') {
        filtradas = parcelas.filter(p => p.status_parcela === 'pago');
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
}