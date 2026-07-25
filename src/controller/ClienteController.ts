import Cliente from "../model/Cliente.js";
import { type Request, type Response } from "express";
import type ClienteDTO from "../interface/ClienteDTO.js";
import logger from "../services/Logger.js";
import { isNumeroValido } from "../services/Utilitario.js";

export default class ClienteController {

  static async todos(req: Request, res: Response) {
    try {
      const listaDeClientes = await Cliente.listarClientes();

      if (!Array.isArray(listaDeClientes)) {
        res.status(200).json([listaDeClientes]);
        return;
      }

      if (listaDeClientes.length === 0) {
        res.status(204).send();
        return;
      }

      res.status(200).json(listaDeClientes);
    } catch (error) {
      logger.error({ error }, "[ClienteController] Erro ao listar clientes");
      res.status(500).json({
        mensagem: "Erro interno ao recuperar a lista de clientes."
      });
    }
  }

  static async cliente(req: Request, res: Response) {
    try {
      const idCliente = parseInt(req.params.id as string);

      if (!isNumeroValido(idCliente)) {
        res.status(400).json({
          mensagem: "ID invalido. Informe um numero inteiro positivo."
        });
        return;
      }

      const cliente = await Cliente.listarClientes(idCliente);
      res.status(200).json(cliente);
    } catch (error: any) {
      logger.error({ error, id: req.params.id }, "[ClienteController] Erro ao buscar cliente");

      if (error.message?.includes("não encontrado")) {
        res.status(404).json({ mensagem: error.message });
        return;
      }

      res.status(500).json({
        mensagem: "Erro interno ao recuperar o cliente."
      });
    }
  }

  static async cadastrar(req: Request, res: Response) {
    try {
          console.log('[ClienteController] Requisicao recebida em /api/clientes');
          console.log('[ClienteController] Body:', req.body);
          console.log('[ClienteController] Headers:', req.headers);
      const dadosRecebidos = req.body;

      const novoCliente = new Cliente(
        dadosRecebidos.nome,
        dadosRecebidos.sobrenome,
        dadosRecebidos.telefone,
        dadosRecebidos.cidade,
        dadosRecebidos.estado,
        dadosRecebidos.criado_em ? new Date(dadosRecebidos.criado_em) : new Date()
      );

      const result = await Cliente.cadastrarCliente(novoCliente);

      if (result) {
        res.status(201).json({ mensagem: "Cliente cadastrado com sucesso." });
      } else {
        res.status(400).json({ mensagem: "Nao foi possivel cadastrar o cliente." });
      }
    } catch (error) {
      logger.error({ error }, "[ClienteController] Erro ao cadastrar cliente");
      res.status(500).json({
        mensagem: "Erro interno ao cadastrar o cliente."
      });
    }
  }

  static async atualizar(req: Request, res: Response) {
    try {
      const idCliente = parseInt(req.params.id as string);

      if (!isNumeroValido(idCliente)) {
        res.status(400).json({
          mensagem: "ID invalido. Informe um numero inteiro positivo."
        });
        return;
      }

      const dadosRecebidos = req.body;

      const cliente = new Cliente(
        dadosRecebidos.nome,
        dadosRecebidos.sobrenome,
        dadosRecebidos.telefone,
        dadosRecebidos.cidade,
        dadosRecebidos.estado,
        dadosRecebidos.criado_em ? new Date(dadosRecebidos.criado_em) : new Date()
      );

      cliente.setIdCliente(idCliente);

      const result = await Cliente.atualizarCliente(cliente);

      if (result) {
        res.status(200).json({ mensagem: "Cliente atualizado com sucesso." });
      } else {
        res.status(404).json({
          mensagem: "Cliente nao encontrado ou ja esta inativo."
        });
      }
    } catch (error: any) {
      logger.error({ error, id: req.params.id }, "[ClienteController] Erro ao atualizar cliente");

      if (error.message?.includes("nao encontrado")) {
        res.status(404).json({ mensagem: error.message });
        return;
      }

      res.status(500).json({
        mensagem: "Erro interno ao atualizar o cliente."
      });
    }
  }

  static async remover(req: Request, res: Response) {
    try {
      const idCliente = parseInt(req.params.id as string);

      if (!isNumeroValido(idCliente)) {
        res.status(400).json({
          mensagem: "ID invalido. Informe um numero inteiro positivo."
        });
        return;
      }

      const result = await Cliente.removerCliente(idCliente);

      if (result) {
        res.status(200).json({ mensagem: "Cliente removido com sucesso." });
      } else {
        res.status(404).json({
          mensagem: "Cliente nao encontrado ou ja esta inativo."
        });
      }
    } catch (error: any) {
      logger.error({ error, id: req.params.id }, "[ClienteController] Erro ao remover cliente");

      if (error.message?.includes("nao encontrado")) {
        res.status(404).json({ mensagem: error.message });
        return;
      }

      res.status(500).json({
        mensagem: "Erro interno ao remover o cliente."
      });
    }
  }

  static async resumo(req: Request, res: Response) {
    try {
      const idCliente = parseInt(req.params.id as string);

      if (!isNumeroValido(idCliente)) {
        res.status(400).json({
          mensagem: "ID invalido. Informe um numero inteiro positivo."
        });
        return;
      }

      const resumo = await Cliente.obterResumo(idCliente);
      res.status(200).json(resumo);
    } catch (error: any) {
      logger.error({ error, id: req.params.id }, "[ClienteController] Erro ao buscar resumo do cliente");

      if (error.message?.includes("nao encontrado")) {
        res.status(404).json({ mensagem: error.message });
        return;
      }

      res.status(500).json({
        mensagem: "Erro interno ao recuperar o resumo do cliente."
      });
    }
  }
}