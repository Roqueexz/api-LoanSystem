import { type Request, type Response } from "express";
import Calendario from "../model/Calendario.js";
import logger from "../services/Logger.js";

export default class CalendarioController {
  static async eventos(req: Request, res: Response) {
    try {
      const usuario = (req as any).usuario;
      const idUsuario = Number(usuario?.id);

      if (!Number.isFinite(idUsuario)) {
        return res.status(401).json({ mensagem: "Usuário não autenticado." });
      }

      const { tipo, data } = req.query;
      const eventos = await Calendario.obterEventosCalendario(
        idUsuario,
        tipo as string,
        data as string,
      );
      return res.status(200).json(eventos);
    } catch (error) {
      logger.error({ error }, "[CalendarioController] Erro ao obter eventos");
      return res
        .status(500)
        .json({ mensagem: "Erro interno ao recuperar eventos do calendário." });
    }
  }

  static async previsualizarMes(req: Request, res: Response) {
    try {
      const usuario = (req as any).usuario;
      const idUsuario = Number(usuario?.id);

      if (!Number.isFinite(idUsuario)) {
        return res.status(401).json({ mensagem: "Usuário não autenticado." });
      }

      const { anoMes } = req.query;
      const eventos = await Calendario.previsualizarEventosMes(
        idUsuario,
        anoMes as string,
      );
      return res.status(200).json(eventos);
    } catch (error) {
      logger.error(
        { error },
        "[CalendarioController] Erro ao previsualizar mês",
      );
      return res.status(500).json({ mensagem: "Erro interno ao previsualizar mês." });
    }
  }

  static async criarEvento(req: Request, res: Response) {
    try {
      const evento = await Calendario.criarEvento(req.body);
      res.status(201).json(evento);
    } catch (error) {
      logger.error({ error }, "[CalendarioController] Erro ao criar evento");
      res.status(500).json({ mensagem: "Erro interno ao criar evento." });
    }
  }

  static async atualizarRegra(req: Request, res: Response) {
    try {
      const { tipo, dataKey, hasRule } = req.body;
      await Calendario.atualizarRegraCalendario(tipo, dataKey, hasRule);
      res.status(200).json({ sucesso: true });
    } catch (error) {
      logger.error({ error }, "[CalendarioController] Erro ao atualizar regra");
      res.status(500).json({ mensagem: "Erro interno ao atualizar regra." });
    }
  }
}
