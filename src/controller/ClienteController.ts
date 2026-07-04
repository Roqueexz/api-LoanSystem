import Cliente from "../model/Cliente.js";
import { type Request, type Response } from "express";
import type ClienteDTO from "../interface/ClienteDTO.js";

export default class ClienteController {
    // Removido o 'extends Cliente'

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
            console.error(`[ClienteController] Erro ao listar clientes:`, error);
            res.status(500).json({
                mensagem: "Erro interno ao recuperar a lista de clientes."
            });
        }
    }

    static async cliente(req: Request, res: Response) {
        try {
            const idCliente = parseInt(req.params.id as string);

            if (isNaN(idCliente) || idCliente <= 0) {
                res.status(400).json({
                    mensagem: "ID inválido. Informe um número inteiro positivo."
                });
                return;
            }

            const cliente = await Cliente.listarClientes(idCliente);
            res.status(200).json(cliente);
        } catch (error: any) {
            console.error(`[ClienteController] Erro ao buscar cliente (id: ${req.params.id}):`, error);

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
            const dadosRecebidos: ClienteDTO = req.body;

            if (
                !dadosRecebidos.nome_cliente ||
                !dadosRecebidos.sobrenome_cliente ||
                !dadosRecebidos.telefone ||
                !dadosRecebidos.cidade ||
                !dadosRecebidos.estado
            ) {
                res.status(400).json({
                    mensagem: "Campos obrigatórios ausentes: nome, sobrenome, telefone, cidade e estado."
                });
                return;
            }

            const novoCliente = new Cliente(
                dadosRecebidos.nome_cliente,
                dadosRecebidos.sobrenome_cliente,
                dadosRecebidos.telefone,
                dadosRecebidos.cidade,
                dadosRecebidos.estado,
                dadosRecebidos.criado_em ? new Date(dadosRecebidos.criado_em) : new Date()
            );

            const result = await Cliente.cadastrarCliente(novoCliente);

            if (result) {
                res.status(201).json({ mensagem: "Cliente cadastrado com sucesso." });
            } else {
                res.status(400).json({ mensagem: "Não foi possível cadastrar o cliente." });
            }
        } catch (error) {
            console.error(`[ClienteController] Erro ao cadastrar cliente:`, error);
            res.status(500).json({
                mensagem: "Erro interno ao cadastrar o cliente."
            });
        }
    }

    static async atualizar(req: Request, res: Response) {
        try {
            const idCliente = parseInt(req.params.id as string);

            if (isNaN(idCliente) || idCliente <= 0) {
                res.status(400).json({
                    mensagem: "ID inválido. Informe um número inteiro positivo."
                });
                return;
            }

            const dadosRecebidos: ClienteDTO = req.body;

            if (
                !dadosRecebidos.nome_cliente ||
                !dadosRecebidos.sobrenome_cliente ||
                !dadosRecebidos.telefone ||
                !dadosRecebidos.cidade ||
                !dadosRecebidos.estado
            ) {
                res.status(400).json({
                    mensagem: "Campos obrigatórios ausentes: nome, sobrenome, telefone, cidade e estado."
                });
                return;
            }

            const cliente = new Cliente(
                dadosRecebidos.nome_cliente,
                dadosRecebidos.sobrenome_cliente,
                dadosRecebidos.telefone,
                dadosRecebidos.cidade,
                dadosRecebidos.estado,
                dadosRecebidos.criado_em ? new Date(dadosRecebidos.criado_em) : new Date()
            );

            cliente.setIdCliente(idCliente);

            const result = await Cliente.atualizarCliente(cliente);

            if (result) {
                res.status(200).json({ mensagem: "Cliente updated com sucesso." });
            } else {
                res.status(404).json({
                    mensagem: "Cliente não encontrado ou já está inativo."
                });
            }
        } catch (error: any) {
            console.error(`[ClienteController] Erro ao atualizar cliente (id: ${req.params.id}):`, error);

            if (error.message?.includes("não encontrado")) {
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

            if (isNaN(idCliente) || idCliente <= 0) {
                res.status(400).json({
                    mensagem: "ID inválido. Informe um número inteiro positivo."
                });
                return;
            }

            const result = await Cliente.removerCliente(idCliente);

            if (result) {
                res.status(200).json({ mensagem: "Cliente removido com sucesso." });
            } else {
                res.status(404).json({
                    mensagem: "Cliente não encontrado ou já está inativo."
                });
            }
        } catch (error: any) {
            console.error(`[ClienteController] Erro ao remover cliente (id: ${req.params.id}):`, error);

            if (error.message?.includes("não encontrado")) {
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

    if (isNaN(idCliente) || idCliente <= 0) {
      res.status(400).json({
        mensagem: "ID invalido. Informe um numero inteiro positivo."
      });
      return;
    }

    const resumo = await Cliente.obterResumo(idCliente);
    res.status(200).json(resumo);
  } catch (error: any) {
    console.error(`[ClienteController] Erro ao buscar resumo do cliente (id: ${req.params.id}):`, error);

    if (error.message?.includes("não encontrado")) {
      res.status(404).json({ mensagem: error.message });
      return;
    }

    res.status(500).json({
      mensagem: "Erro interno ao recuperar o resumo do cliente."
    });
  }
}
}