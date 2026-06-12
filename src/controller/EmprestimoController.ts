import Emprestimo from "../model/Emprestimo.js";
import { type Request, type Response } from "express";

export default class EmprestimoController {
  // Removido o 'extends', não precisa dele aqui!

  static async todos(req: Request, res: Response) {
    try {
      const lista = await Emprestimo.listarEmprestimos();
      if (!lista || lista.length === 0) {
        res.status(204).send();
        return;
      }
      res.status(200).json(lista);
    } catch (error) {
      console.error(`[EmprestimoController] Erro ao listar emprestimos:`, error);
      res.status(500).json({ mensagem: "Erro interno ao recuperar emprestimos." });
    }
  }

  static async emprestimo(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id as string);
      if (isNaN(id) || id <= 0) {
        res.status(400).json({ mensagem: "ID inválido. Informe um número inteiro positivo." });
        return;
      }

      const emp = await Emprestimo.listarEmprestimo(id);
      res.status(200).json(emp);
    } catch (error: any) {
      console.error(`[EmprestimoController] Erro ao buscar emprestimo (id: ${req.params.id}):`, error);
      if (error.message?.includes("não encontrado")) {
        res.status(404).json({ mensagem: error.message });
        return;
      }
      res.status(500).json({ mensagem: "Erro interno ao recuperar emprestimo." });
    }
  }

  static async cadastrar(req: Request, res: Response) {
    try {
      const dados = req.body;

      // Adicionado tipo_juros na validação obrigatória
      if (!dados.id_cliente || !dados.valor_emprestimo || !dados.num_parcelas || !dados.valor_parcela || !dados.tipo_juros || dados.juros == null) {
        res.status(400).json({ mensagem: "Campos obrigatórios ausentes." });
        return;
      }

      // Criando a instância passando também o tipo_juros
      const novo = new Emprestimo(
        dados.id_cliente,
        Number(dados.valor_emprestimo),
        Number(dados.num_parcelas),
        Number(dados.valor_parcela),
        String(dados.tipo_juros),
        Number(dados.juros),
        dados.data_emprestimo ? new Date(dados.data_emprestimo) : new Date(),
        dados.data_devolucao ? new Date(dados.data_devolucao) : undefined,
        dados.status_emprestimo ?? true,
      );

      const result = await Emprestimo.cadastrarEmprestimo(novo);
      if (result) {
        res.status(201).json({ mensagem: "Empréstimo cadastrado com sucesso." });
      } else {
        res.status(400).json({ mensagem: "Não foi possível cadastrar o empréstimo." });
      }
    } catch (error) {
      console.error(`[EmprestimoController] Erro ao cadastrar emprestimo:`, error);
      res.status(500).json({ mensagem: "Erro interno ao cadastrar emprestimo." });
    }
  }

  static async remover(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id as string);
      if (isNaN(id) || id <= 0) {
        res.status(400).json({ mensagem: "ID inválido. Informe um número inteiro positivo." });
        return;
      }

      const result = await Emprestimo.removerEmprestimo(id);
      if (result) {
        res.status(200).json({ mensagem: "Empréstimo removido com sucesso." });
      } else {
        res.status(404).json({ mensagem: "Empréstimo não encontrado." });
      }
    } catch (error) {
      console.error(`[EmprestimoController] Erro ao remover emprestimo (id: ${req.params.id}):`, error);
      res.status(500).json({ mensagem: "Erro interno ao remover emprestimo." });
    }
  }

  static async atualizar(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id as string);
      if (isNaN(id) || id <= 0) {
        res.status(400).json({ mensagem: "ID inválido. Informe um número inteiro positivo." });
        return;
      }

      const dados = req.body;
      if (!dados.id_cliente || !dados.valor_emprestimo || !dados.num_parcelas || !dados.valor_parcela || !dados.tipo_juros || dados.juros == null) {
        res.status(400).json({ mensagem: "Campos obrigatórios ausentes." });
        return;
      }

      const emp = new Emprestimo(
        dados.id_cliente,
        Number(dados.valor_emprestimo),
        Number(dados.num_parcelas),
        Number(dados.valor_parcela),
        String(dados.tipo_juros),
        Number(dados.juros),
        dados.data_emprestimo ? new Date(dados.data_emprestimo) : new Date(),
        dados.data_devolucao ? new Date(dados.data_devolucao) : undefined,
        dados.status_emprestimo ?? true,
      );
      emp.setIdEmprestimo(id);

      const result = await Emprestimo.atualizarEmprestimo(emp);
      if (result) {
        res.status(200).json({ mensagem: "Empréstimo atualizado com sucesso." });
      } else {
        res.status(404).json({ mensagem: "Empréstimo não encontrado ou sem alterações." });
      }
    } catch (error: any) {
      console.error(`[EmprestimoController] Erro ao atualizar emprestimo (id: ${req.params.id}):`, error);
      if (error.message?.includes("não encontrado")) {
        res.status(404).json({ mensagem: error.message });
        return;
      }
      res.status(500).json({ mensagem: "Erro interno ao atualizar emprestimo." });
    }
  }
}