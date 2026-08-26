import type { Request, Response } from 'express';
import Notificacao from '../model/Notificacao.js';
import logger from '../services/Logger.js';

export default class NotificacaoController {
  static async listar(req: Request, res: Response) {
    try {
      const usuario = (req as any).usuario;
      const idUsuario = Number(usuario?.id ?? 0);
      const resultado = await Notificacao.listar(idUsuario);
      res.status(200).json(resultado);
    } catch (error) {
      logger.error({ error }, '[NotificacaoController] Erro ao listar notificações');
      res.status(500).json({ mensagem: 'Erro interno ao carregar notificações.' });
    }
  }

  static async preferencia(req: Request, res: Response) {
    try {
      const usuario = (req as any).usuario;
      const idUsuario = Number(usuario?.id ?? 0);
      const preferencias = await Notificacao.obterPreferencias(idUsuario);
      res.status(200).json(preferencias);
    } catch (error) {
      logger.error({ error }, '[NotificacaoController] Erro ao recuperar preferências');
      res.status(500).json({ mensagem: 'Erro interno ao carregar preferências.' });
    }
  }

  static async atualizarPreferencia(req: Request, res: Response) {
    try {
      const usuario = (req as any).usuario;
      const idUsuario = Number(usuario?.id ?? 0);
      const preferenciasAtualizadas = await Notificacao.atualizarPreferencias(idUsuario, req.body);
      res.status(200).json(preferenciasAtualizadas);
    } catch (error) {
      logger.error({ error }, '[NotificacaoController] Erro ao atualizar preferências');
      res.status(500).json({ mensagem: 'Erro interno ao atualizar preferências.' });
    }
  }

  static async marcarComoLida(req: Request, res: Response) {
    try {
      const usuario = (req as any).usuario;
      const idUsuario = Number(usuario?.id ?? 0);
      const idNotificacao = Number(req.params.id);
      const sucesso = await Notificacao.marcarComoLida(idUsuario, idNotificacao);
      res.status(200).json({ sucesso });
    } catch (error) {
      logger.error({ error }, '[NotificacaoController] Erro ao marcar como lida');
      res.status(500).json({ mensagem: 'Erro interno ao atualizar notificação.' });
    }
  }

  static async arquivar(req: Request, res: Response) {
    try {
      const usuario = (req as any).usuario;
      const idUsuario = Number(usuario?.id ?? 0);
      const idNotificacao = Number(req.params.id);
      const sucesso = await Notificacao.arquivar(idUsuario, idNotificacao);
      res.status(200).json({ sucesso });
    } catch (error) {
      logger.error({ error }, '[NotificacaoController] Erro ao arquivar notificação');
      res.status(500).json({ mensagem: 'Erro interno ao arquivar notificação.' });
    }
  }
}
