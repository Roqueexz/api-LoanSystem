import type { Request, Response } from 'express';
import { Admin } from '../model/Admin.js';
import logger from '../services/Logger.js';

export default class AdminController {
  static async resumo(req: Request, res: Response): Promise<any> {
    try {
      const dados = await Admin.resumoGlobal();
      return res.status(200).json(dados);
    } catch (error) {
      logger.error({ error }, '[AdminController] Erro ao buscar resumo global');
      return res.status(500).json({ mensagem: 'Erro ao carregar resumo administrativo.' });
    }
  }

  static async listarCredores(req: Request, res: Response): Promise<any> {
    try {
      const credores = await Admin.listarCredores();
      return res.status(200).json(credores);
    } catch (error) {
      logger.error({ error }, '[AdminController] Erro ao listar credores');
      return res.status(500).json({ mensagem: 'Erro ao carregar lista de credores.' });
    }
  }

  static async criarCredor(req: Request, res: Response): Promise<any> {
    try {
      const { nome, email, senha } = req.body;

      if (!nome || !email || !senha) {
        return res.status(400).json({ mensagem: 'Campos nome, email e senha são obrigatórios.' });
      }

      if (senha.length < 6) {
        return res.status(400).json({ mensagem: 'A senha deve ter pelo menos 6 caracteres.' });
      }

      const novoCredor = await Admin.criarCredor({ nome, email, senha });
      return res.status(201).json(novoCredor);
    } catch (error: any) {
      logger.error({ error }, '[AdminController] Erro ao criar credor');
      if (error?.code === '23505') {
        return res.status(400).json({ mensagem: 'Já existe um credor cadastrado com este e-mail.' });
      }
      return res.status(500).json({ mensagem: 'Erro ao cadastrar credor.' });
    }
  }

  static async suspenderCredor(req: Request, res: Response): Promise<any> {
    try {
      const id = Number(req.params.id);
      const ok = await Admin.suspenderCredor(id);

      if (!ok) {
        return res.status(400).json({ mensagem: 'Credor não encontrado ou é o próprio administrador.' });
      }

      return res.status(200).json({ mensagem: 'Credor suspenso com sucesso.' });
    } catch (error) {
      logger.error({ error }, '[AdminController] Erro ao suspender credor');
      return res.status(500).json({ mensagem: 'Erro ao suspender credor.' });
    }
  }

  static async reativarCredor(req: Request, res: Response): Promise<any> {
    try {
      const id = Number(req.params.id);
      const ok = await Admin.reativarCredor(id);

      if (!ok) {
        return res.status(404).json({ mensagem: 'Credor não encontrado.' });
      }

      return res.status(200).json({ mensagem: 'Credor reativado com sucesso.' });
    } catch (error) {
      logger.error({ error }, '[AdminController] Erro ao reativar credor');
      return res.status(500).json({ mensagem: 'Erro ao reativar credor.' });
    }
  }

  static async removerCredor(req: Request, res: Response): Promise<any> {
    try {
      const id = Number(req.params.id);
      const ok = await Admin.removerCredor(id);

      if (!ok) {
        return res.status(400).json({ mensagem: 'Credor não encontrado ou é um administrador.' });
      }

      return res.status(200).json({ mensagem: 'Credor removido com sucesso.' });
    } catch (error) {
      logger.error({ error }, '[AdminController] Erro ao remover credor');
      return res.status(500).json({ mensagem: 'Erro ao remover credor.' });
    }
  }
}
