// controller/ParcelaController.ts
import Parcela from "../model/Parcela.js";
import { type Request, type Response } from "express";

export default class ParcelaController {
  // --------------------------------------
  // LISTAR PARCELAS DE UM EMPRÉSTIMO
  // GET /api/emprestimos/:id/parcelas
  // --------------------------------------
  static async porEmprestimo(req: Request, res: Response) {
    try {
      const id_emprestimo = parseInt(req.params.id as string);
      if (isNaN(id_emprestimo) || id_emprestimo <= 0) {
        res.status(400).json({ mensagem: "ID do empréstimo inválido." });
        return;
      }

      const parcelas = await Parcela.listarPorEmprestimo(id_emprestimo);

      if (!parcelas || parcelas.length === 0) {
        res.status(204).send();
        return;
      }

      res.status(200).json(parcelas);
    } catch (error) {
      console.error(`[ParcelaController] Erro ao listar parcelas (emprestimo: ${req.params.id}):`, error);
      res.status(500).json({ mensagem: "Erro interno ao listar parcelas." });
    }
  }

  // --------------------------------------
  // BUSCAR PARCELA POR ID
  // GET /api/parcelas/:id
  // --------------------------------------
  static async parcela(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id as string);
      if (isNaN(id) || id <= 0) {
        res.status(400).json({ mensagem: "ID inválido. Informe um número inteiro positivo." });
        return;
      }

      const parcela = await Parcela.buscarPorId(id);
      res.status(200).json(parcela);
    } catch (error: any) {
      console.error(`[ParcelaController] Erro ao buscar parcela (id: ${req.params.id}):`, error);
      if (error.message?.includes("não encontrada")) {
        res.status(404).json({ mensagem: error.message });
        return;
      }
      res.status(500).json({ mensagem: "Erro interno ao recuperar parcela." });
    }
  }

  // --------------------------------------
  // DAR BAIXA NA PARCELA
  // PATCH /api/parcelas/:id/pagar
  // --------------------------------------
  static async pagar(req: Request, res: Response) {
    try {
      const id_parcela = parseInt(req.params.id as string);
      if (isNaN(id_parcela) || id_parcela <= 0) {
        res.status(400).json({ mensagem: "ID da parcela inválido." });
        return;
      }

      const dataPagamento = req.body?.data_pagamento
        ? new Date(req.body.data_pagamento)
        : undefined;

      const result = await Parcela.marcarComoPaga(id_parcela, dataPagamento);

      if (result) {
        res.status(200).json({ mensagem: "Parcela paga com sucesso." });
      } else {
        res.status(404).json({ mensagem: "Parcela não encontrada." });
      }
    } catch (error) {
      console.error(`[ParcelaController] Erro ao dar baixa na parcela (id: ${req.params.id}):`, error);
      res.status(500).json({ mensagem: "Erro interno ao dar baixa na parcela." });
    }
  }

  // --------------------------------------
  // DESFAZER PAGAMENTO
  // PATCH /api/parcelas/:id/desfazer
  // --------------------------------------
  static async desfazer(req: Request, res: Response) {
    try {
      const id_parcela = parseInt(req.params.id as string);
      if (isNaN(id_parcela) || id_parcela <= 0) {
        res.status(400).json({ mensagem: "ID da parcela inválido." });
        return;
      }

      const result = await Parcela.desfazerPagamento(id_parcela);

      if (result) {
        res.status(200).json({ mensagem: "Pagamento desfeito com sucesso." });
      } else {
        res.status(404).json({ mensagem: "Parcela não encontrada." });
      }
    } catch (error) {
      console.error(`[ParcelaController] Erro ao desfazer pagamento (id: ${req.params.id}):`, error);
      res.status(500).json({ mensagem: "Erro interno ao desfazer pagamento." });
    }
  }
}