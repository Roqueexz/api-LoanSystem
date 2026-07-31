import { type Request, type Response } from "express";
import Calendario from "../model/Calendario.js";
import logger from "../services/Logger.js";

export default class CalendarioController {
  static async eventos(req: Request, res: Response) {
    try {
      const { tipo, data } = req.query;
      const eventos = await Calendario.obterEventosCalendario(
        tipo as string,
        data as string,
      );
      res.status(200).json(eventos);
    } catch (error) {
      logger.error({ error }, "[CalendarioController] Erro ao obter eventos");
      res
        .status(500)
        .json({ mensagem: "Erro interno ao recuperar eventos do calendário." });
    }
  }

  static async previsualizarMes(req: Request, res: Response) {
    try {
      const { anoMes } = req.query;
      const eventos = await Calendario.previsualizarEventosMes(
        anoMes as string,
      );
      res.status(200).json(eventos);
    } catch (error) {
      logger.error(
        { error },
        "[CalendarioController] Erro ao previsualizar mês",
      );
      res.status(500).json({ mensagem: "Erro interno ao previsualizar mês." });
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
