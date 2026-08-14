import Emprestimo from "../model/Emprestimo.js";
import { type Request, type Response } from "express";
import logger from "../services/Logger.js";
import { isNumeroValido } from "../services/Utilitario.js";

export default class EmprestimoController {
  
  private static obterIdUsuario(req: Request): number | null {
    const id = (req as any).usuario?.id;
    if (id === undefined || id === null || !isNumeroValido(Number(id))) {
      return null;
    }
    return Number(id);
  }

  static async todos(req: Request, res: Response) {
    try {
      const idUsuario = EmprestimoController.obterIdUsuario(req);
      if (idUsuario === null) {
        res.status(401).json({ mensagem: "Usuario nao autenticado." });
        return;
      }

      const statusParam = req.query.status as string;
      
      let status: 'ativo' | 'quitado' | 'todos' = 'ativo';
      if (statusParam === 'quitado') {
        status = 'quitado';
      } else if (statusParam === 'todos') {
        status = 'todos';
      }

      const lista = await Emprestimo.listarEmprestimos(status, undefined, idUsuario);
      
      if (!lista || lista.length === 0) {
        res.status(204).send();
        return;
      }
      res.status(200).json(lista);
    } catch (error) {
      logger.error({ error }, "[EmprestimoController] Erro ao listar emprestimos");
      res.status(500).json({ mensagem: "Erro interno ao recuperar emprestimos." });
    }
  }

  static async emprestimo(req: Request, res: Response) {
    try {
      const idUsuario = EmprestimoController.obterIdUsuario(req);
      if (idUsuario === null) {
        res.status(401).json({ mensagem: "Usuario nao autenticado." });
        return;
      }

      const id = parseInt(req.params.id as string);

      if (!isNumeroValido(id)) {
        res.status(400).json({ mensagem: "ID invalido. Informe um numero inteiro positivo." });
        return;
      }

      const emp = await Emprestimo.listarEmprestimo(id, idUsuario);
      res.status(200).json(emp);
    } catch (error: any) {
      logger.error({ error, id: req.params.id }, "[EmprestimoController] Erro ao buscar emprestimo");
      
      if (error.message?.includes("nao encontrado") || error.message?.includes("não encontrado")) {
        res.status(404).json({ mensagem: error.message });
        return;
      }
      res.status(500).json({ mensagem: "Erro interno ao recuperar emprestimo." });
    }
  }

  static async cadastrar(req: Request, res: Response) {
    try {
      const idUsuario = EmprestimoController.obterIdUsuario(req);
      if (idUsuario === null) {
        res.status(401).json({ mensagem: "Usuario nao autenticado." });
        return;
      }

      const dados = req.body;

      // Validar se o cliente pertence ao credor
      const clienteExiste = await Emprestimo.validarClientePertenceAoCredor(dados.id_cliente, idUsuario);
      if (!clienteExiste) {
        res.status(400).json({ mensagem: "Cliente nao encontrado ou nao pertence a este credor." });
        return;
      }

      const valorParcela = dados.valor_parcela ? Number(dados.valor_parcela) : 0;

      const novo = new Emprestimo(
        dados.id_cliente,
        Number(dados.valor_emprestimo),
        Number(dados.num_parcelas),
        valorParcela,
        String(dados.tipo_juros),
        Number(dados.juros),
        dados.data_emprestimo ? new Date(dados.data_emprestimo) : new Date(),
        dados.data_devolucao ? new Date(dados.data_devolucao) : undefined,
        dados.status_emprestimo ?? true,
        dados.forma_pagamento ?? null,
      );

      const result = await Emprestimo.cadastrarEmprestimo(novo, idUsuario);
      if (result) {
        res.status(201).json({ mensagem: "Emprestimo cadastrado com sucesso." });
      } else {
        res.status(400).json({ mensagem: "Nao foi possivel cadastrar o emprestimo." });
      }
    } catch (error: any) {
      logger.error({ error }, "[EmprestimoController] Erro ao cadastrar emprestimo");
      
      if (error.message?.includes("Soma das parcelas")) {
        res.status(400).json({ mensagem: error.message });
        return;
      }
      
      res.status(500).json({ mensagem: "Erro interno ao cadastrar emprestimo." });
    }
  }

  static async remover(req: Request, res: Response) {
    try {
      const idUsuario = EmprestimoController.obterIdUsuario(req);
      if (idUsuario === null) {
        res.status(401).json({ mensagem: "Usuario nao autenticado." });
        return;
      }

      const id = parseInt(req.params.id as string);

      if (!isNumeroValido(id)) {
        res.status(400).json({ mensagem: "ID invalido. Informe um numero inteiro positivo." });
        return;
      }

      const result = await Emprestimo.removerEmprestimo(id, idUsuario);
      if (result) {
        res.status(200).json({ mensagem: "Emprestimo removido com sucesso." });
      } else {
        res.status(404).json({ mensagem: "Emprestimo nao encontrado." });
      }
    } catch (error: any) {
      logger.error({ error, id: req.params.id }, "[EmprestimoController] Erro ao remover emprestimo");
      
      if (error.message?.includes("parcela")) {
        res.status(400).json({ mensagem: error.message });
        return;
      }
      
      res.status(500).json({ mensagem: "Erro interno ao remover emprestimo." });
    }
  }

  static async atualizar(req: Request, res: Response) {
    try {
      const idUsuario = EmprestimoController.obterIdUsuario(req);
      if (idUsuario === null) {
        res.status(401).json({ mensagem: "Usuario nao autenticado." });
        return;
      }

      const id = parseInt(req.params.id as string);

      if (!isNumeroValido(id)) {
        res.status(400).json({ mensagem: "ID invalido. Informe um numero inteiro positivo." });
        return;
      }

      const dados = req.body;

      // Validar se o cliente pertence ao credor
      const clienteExiste = await Emprestimo.validarClientePertenceAoCredor(dados.id_cliente, idUsuario);
      if (!clienteExiste) {
        res.status(400).json({ mensagem: "Cliente nao encontrado ou nao pertence a este credor." });
        return;
      }

      const valorParcela = dados.valor_parcela ? Number(dados.valor_parcela) : 0;

      const emp = new Emprestimo(
        dados.id_cliente,
        Number(dados.valor_emprestimo),
        Number(dados.num_parcelas),
        valorParcela,
        String(dados.tipo_juros),
        Number(dados.juros),
        dados.data_emprestimo ? new Date(dados.data_emprestimo) : new Date(),
        dados.data_devolucao ? new Date(dados.data_devolucao) : undefined,
        dados.status_emprestimo ?? true,
        dados.forma_pagamento ?? null,
      );
      emp.setIdEmprestimo(id);

      const result = await Emprestimo.atualizarEmprestimo(emp, idUsuario);
      if (result) {
        res.status(200).json({ mensagem: "Emprestimo atualizado com sucesso." });
      } else {
        res.status(404).json({ mensagem: "Emprestimo nao encontrado ou sem alteracoes." });
      }
    } catch (error: any) {
      logger.error({ error, id: req.params.id }, "[EmprestimoController] Erro ao atualizar emprestimo");
      
      if (error.message?.includes("Soma das parcelas")) {
        res.status(400).json({ mensagem: error.message });
        return;
      }
      
      if (error.message?.includes("nao encontrado") || error.message?.includes("não encontrado")) {
        res.status(404).json({ mensagem: error.message });
        return;
      }
      
      if (error.message?.includes("Nao e possivel reduzir")) {
        res.status(400).json({ mensagem: error.message });
        return;
      }
      
      res.status(500).json({ mensagem: "Erro interno ao atualizar emprestimo." });
    }
  }
}