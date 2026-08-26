import Cliente from "../model/Cliente.js";
import { type Request, type Response } from "express";
import logger from "../services/Logger.js";
import { isNumeroValido } from "../services/Utilitario.js";
import Usuario from "../model/Usuario.js";

export default class ClienteController {

  private static obterIdUsuario(req: Request): number | null {
    const id = (req as any).usuario?.id;
    if (id === undefined || id === null || !isNumeroValido(Number(id))) {
      return null;
    }
    return Number(id);
  }

  static async todos(req: Request, res: Response) {
    try {
      const idUsuario = ClienteController.obterIdUsuario(req);
      if (idUsuario === null) {
        res.status(401).json({ mensagem: "Usuário não autenticado." });
        return;
      }

      const listaDeClientes = await Cliente.listarClientes(idUsuario);

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
      const idUsuario = ClienteController.obterIdUsuario(req);
      if (idUsuario === null) {
        res.status(401).json({ mensagem: "Usuário não autenticado." });
        return;
      }

      const idCliente = parseInt(req.params.id as string);

      if (!isNumeroValido(idCliente)) {
        res.status(400).json({
          mensagem: "ID invalido. Informe um numero inteiro positivo."
        });
        return;
      }

      const cliente = await Cliente.listarClientes(idUsuario, idCliente);
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
      console.log('[DEBUG] ===== INICIO CADASTRO CLIENTE =====');
      
      const idUsuario = (req as any).usuario?.id;
      console.log('[DEBUG] ID do usuario do JWT:', idUsuario);
      console.log('[DEBUG] Usuario completo:', JSON.stringify((req as any).usuario, null, 2));
      
      if (!idUsuario) {
        console.log('[DEBUG] ID usuario nao encontrado no JWT');
        res.status(401).json({ mensagem: "Usuario nao autenticado." });
        return;
      }
  
      const dadosRecebidos = req.body;
      console.log('[DEBUG] Dados recebidos do frontend:', JSON.stringify(dadosRecebidos, null, 2));
  
      const nome = dadosRecebidos.nome_cliente || dadosRecebidos.nome || "";
      const sobrenome = dadosRecebidos.sobrenome_cliente || dadosRecebidos.sobrenome || "";
      console.log('[DEBUG] Nome:', nome, 'Sobrenome:', sobrenome);
  
      if (!nome.trim()) {
        console.log('[DEBUG] Nome vazio');
        res.status(400).json({ mensagem: "Nome do cliente é obrigatório." });
        return;
      }
  
      const telefone = (dadosRecebidos.telefone || "").replace(/\D/g, '');
      console.log('[DEBUG] Telefone limpo:', telefone);
  
      const novoCliente = new Cliente(
        nome,
        sobrenome,
        telefone,
        dadosRecebidos.cidade || "",
        dadosRecebidos.estado || "",
        dadosRecebidos.criado_em ? new Date(dadosRecebidos.criado_em) : new Date()
      );
  
      console.log('[DEBUG] Cliente criado:', {
        nome: novoCliente.getNome(),
        sobrenome: novoCliente.getSobrenome(),
        telefone: novoCliente.getTelefone(),
        cidade: novoCliente.getCidade(),
        estado: novoCliente.getEstado(),
        criadoEm: novoCliente.getCriadoEm()
      });
  
      console.log('[DEBUG] Chamando Cliente.cadastrarCliente com idUsuario:', idUsuario);
      const id_cliente = await Cliente.cadastrarCliente(novoCliente, idUsuario);
      console.log('[DEBUG] Resultado do cadastro:', id_cliente);
  
      if (id_cliente) {
        console.log('[DEBUG] Cliente cadastrado com sucesso! ID:', id_cliente);
        res.status(201).json({ mensagem: "Cliente cadastrado com sucesso.", id_cliente });
      } else {
        console.log('[DEBUG] id_cliente retornou null/undefined');
        res.status(400).json({ mensagem: "Não foi possível cadastrar o cliente." });
      }
    } catch (error) {
      console.error('[DEBUG] ===== ERRO NO CADASTRO =====');
      console.error('[DEBUG] Erro completo:', error);
      console.error('[DEBUG] Stack trace:', error instanceof Error ? error.stack : 'Sem stack');
      logger.error({ error }, "[ClienteController] Erro ao cadastrar cliente");
      res.status(500).json({
        mensagem: "Erro interno ao cadastrar o cliente."
      });
    }
  }
  

  static async atualizar(req: Request, res: Response) {
    try {
      const idUsuario = ClienteController.obterIdUsuario(req);
      if (idUsuario === null) {
        res.status(401).json({ mensagem: "Usuário não autenticado." });
        return;
      }

      const idCliente = parseInt(req.params.id as string);

      if (!isNumeroValido(idCliente)) {
        res.status(400).json({
          mensagem: "ID invalido. Informe um numero inteiro positivo."
        });
        return;
      }

      const dadosRecebidos = req.body;

      const nome = dadosRecebidos.nome_cliente || dadosRecebidos.nome || "";
      const sobrenome = dadosRecebidos.sobrenome_cliente || dadosRecebidos.sobrenome || "";

      const telefone = (dadosRecebidos.telefone || "").replace(/\D/g, '');

      const cliente = new Cliente(
        nome,
        sobrenome,
        telefone,
        dadosRecebidos.cidade || "",
        dadosRecebidos.estado || "",
        dadosRecebidos.criado_em ? new Date(dadosRecebidos.criado_em) : new Date()
      );

      cliente.setIdCliente(idCliente);

      const result = await Cliente.atualizarCliente(cliente, idUsuario);

      if (result) {
        res.status(200).json({ mensagem: "Cliente atualizado com sucesso." });
      } else {
        res.status(404).json({
          mensagem: "Cliente nao encontrado ou ja esta inativo."
        });
      }
    } catch (error: any) {
      logger.error({ error, id: req.params.id }, "[ClienteController] Erro ao atualizar cliente");

      if (error.message?.includes("nao encontrado") || error.message?.includes("não encontrado")) {
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
      const idUsuario = ClienteController.obterIdUsuario(req);
      if (idUsuario === null) {
        res.status(401).json({ mensagem: "Usuário não autenticado." });
        return;
      }

      const idCliente = parseInt(req.params.id as string);

      if (!isNumeroValido(idCliente)) {
        res.status(400).json({
          mensagem: "ID invalido. Informe um numero inteiro positivo."
        });
        return;
      }

      const result = await Cliente.removerCliente(idCliente, idUsuario);

      if (result) {
        res.status(200).json({ mensagem: "Cliente removido com sucesso." });
      } else {
        res.status(404).json({
          mensagem: "Cliente nao encontrado ou ja esta inativo."
        });
      }
    } catch (error: any) {
      logger.error({ error, id: req.params.id }, "[ClienteController] Erro ao remover cliente");

      if (error.message?.includes("nao encontrado") || error.message?.includes("não encontrado")) {
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
      const idUsuario = ClienteController.obterIdUsuario(req);
      if (idUsuario === null) {
        res.status(401).json({ mensagem: "Usuário não autenticado." });
        return;
      }

      const idCliente = parseInt(req.params.id as string);

      if (!isNumeroValido(idCliente)) {
        res.status(400).json({
          mensagem: "ID invalido. Informe um numero inteiro positivo."
        });
        return;
      }

      const resumo = await Cliente.obterResumo(idCliente, idUsuario);
      res.status(200).json(resumo);
    } catch (error: any) {
      logger.error({ error, id: req.params.id }, "[ClienteController] Erro ao buscar resumo do cliente");

      if (error.message?.includes("nao encontrado") || error.message?.includes("não encontrado")) {
        res.status(404).json({ mensagem: error.message });
        return;
      }

      res.status(500).json({
        mensagem: "Erro interno ao recuperar o resumo do cliente."
      });
    }
  }
}
