import { type Request, type Response } from "express";
import Caixa from "../model/Caixa.js";
import logger from "../services/Logger.js";
import { isNumeroValido } from "../services/Utilitario.js";

export default class CaixaController {
  
  private static obterIdUsuario(req: Request): number | null {
    const id = (req as any).usuario?.id;
    if (id === undefined || id === null || !isNumeroValido(Number(id))) {
      return null;
    }
    return Number(id);
  }

  static async resumo(req: Request, res: Response) {
    try {
      const idUsuario = CaixaController.obterIdUsuario(req);
      if (idUsuario === null) {
        res.status(401).json({ mensagem: "Usuario nao autenticado." });
        return;
      }

      const resumoFinanceiro = await Caixa.obterResumoFinanceiro(idUsuario);
      res.status(200).json(resumoFinanceiro);
    } catch (error) {
      logger.error(
        { error },
        "[CaixaController] Erro ao obter resumo financeiro",
      );
      res.status(500).json({
        mensagem: "Erro interno ao recuperar o resumo financeiro.",
      });
    }
  }

  static async relatorioDiario(req: Request, res: Response) {
    try {
      const idUsuario = CaixaController.obterIdUsuario(req);
      if (idUsuario === null) {
        res.status(401).json({ mensagem: "Usuario nao autenticado." });
        return;
      }

      const { data } = req.query;

      if (data && typeof data !== "string") {
        res.status(400).json({
          mensagem: "Parametro 'data' invalido. Use o formato YYYY-MM-DD.",
        });
        return;
      }

      const relatorio = await Caixa.obterRelatorioDiario(idUsuario, data as string);
      res.status(200).json(relatorio);
    } catch (error) {
      logger.error(
        { error },
        "[CaixaController] Erro ao obter relatorio diario",
      );
      res.status(500).json({
        mensagem: "Erro interno ao recuperar o relatorio diario.",
      });
    }
  }

  static async relatorioMensal(req: Request, res: Response) {
    try {
      const idUsuario = CaixaController.obterIdUsuario(req);
      if (idUsuario === null) {
        res.status(401).json({ mensagem: "Usuario nao autenticado." });
        return;
      }

      const { ano, mes } = req.query;

      if (ano && !isNumeroValido(Number(ano))) {
        res.status(400).json({
          mensagem: "Parametro 'ano' invalido. Informe um numero valido.",
        });
        return;
      }

      if (mes) {
        const mesNum = Number(mes);
        if (!isNumeroValido(mesNum) || mesNum < 1 || mesNum > 12) {
          res.status(400).json({
            mensagem: "Parametro 'mes' invalido. Informe um valor entre 1 e 12.",
          });
          return;
        }
      }

      const relatorio = await Caixa.obterRelatorioMensal(
        idUsuario,
        ano ? Number(ano) : undefined,
        mes ? Number(mes) : undefined,
      );
      res.status(200).json(relatorio);
    } catch (error) {
      logger.error(
        { error },
        "[CaixaController] Erro ao obter relatorio mensal",
      );
      res.status(500).json({
        mensagem: "Erro interno ao recuperar o relatorio mensal.",
      });
    }
  }

  static async relatorioAnual(req: Request, res: Response) {
    try {
      const idUsuario = CaixaController.obterIdUsuario(req);
      if (idUsuario === null) {
        res.status(401).json({ mensagem: "Usuario nao autenticado." });
        return;
      }

      const { ano } = req.query;

      if (ano && !isNumeroValido(Number(ano))) {
        res.status(400).json({
          mensagem: "Parametro 'ano' invalido. Informe um numero valido.",
        });
        return;
      }

      const relatorio = await Caixa.obterRelatorioAnual(
        idUsuario,
        ano ? Number(ano) : undefined,
      );
      res.status(200).json(relatorio);
    } catch (error) {
      logger.error(
        { error },
        "[CaixaController] Erro ao obter relatorio anual",
      );
      res.status(500).json({
        mensagem: "Erro interno ao recuperar o relatorio anual.",
      });
    }
  }

  static async dashboardInteligente(req: Request, res: Response) {
    try {
      const idUsuario = CaixaController.obterIdUsuario(req);
      if (idUsuario === null) {
        res.status(401).json({ mensagem: "Usuario nao autenticado." });
        return;
      }

      const dashboardData = await Caixa.obterDashboardInteligente(idUsuario);
      res.status(200).json(dashboardData);
    } catch (error) {
      logger.error(
        { error },
        "[CaixaController] Erro ao obter dashboard inteligente",
      );
      res.status(500).json({
        mensagem: "Erro interno ao recuperar o dashboard inteligente.",
      });
    }
  }

  static async indicadoresFinanceiros(req: Request, res: Response) {
    try {
      const idUsuario = CaixaController.obterIdUsuario(req);
      if (idUsuario === null) {
        res.status(401).json({ mensagem: "Usuario nao autenticado." });
        return;
      }

      const indicadores = await Caixa.obterIndicadoresFinanceiros(idUsuario);
      res.status(200).json(indicadores);
    } catch (error) {
      logger.error(
        { error },
        "[CaixaController] Erro ao obter indicadores financeiros",
      );
      res.status(500).json({
        mensagem: "Erro interno ao recuperar os indicadores financeiros.",
      });
    }
  }
}