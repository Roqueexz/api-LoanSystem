import { type Request, type Response } from "express";
import Caixa from "../model/Caixa.js";
import logger from "../services/Logger.js";
import { isNumeroValido } from "../services/Utilitario.js";

export default class CaixaController {
  static async resumo(req: Request, res: Response) {
    try {
      const resumoFinanceiro = await Caixa.obterResumoFinanceiro();
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
      const { data } = req.query;

      // Validar data se fornecida
      if (data && typeof data !== "string") {
        return res.status(400).json({
          mensagem: "Parametro 'data' invalido. Use o formato YYYY-MM-DD.",
        });
      }

      const relatorio = await Caixa.obterRelatorioDiario(data as string);
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
      const { ano, mes } = req.query;

      // Validar ano se fornecido
      if (ano && !isNumeroValido(Number(ano))) {
        return res.status(400).json({
          mensagem: "Parametro 'ano' invalido. Informe um numero valido.",
        });
      }

      // Validar mes se fornecido
      if (mes) {
        const mesNum = Number(mes);
        if (!isNumeroValido(mesNum) || mesNum < 1 || mesNum > 12) {
          return res.status(400).json({
            mensagem:
              "Parametro 'mes' invalido. Informe um valor entre 1 e 12.",
          });
        }
      }

      const relatorio = await Caixa.obterRelatorioMensal(
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
      const { ano } = req.query;

      // Validar ano se fornecido
      if (ano && !isNumeroValido(Number(ano))) {
        return res.status(400).json({
          mensagem: "Parametro 'ano' invalido. Informe um numero valido.",
        });
      }

      const relatorio = await Caixa.obterRelatorioAnual(
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
      const dashboardData = await Caixa.obterDashboardInteligente();
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
      const indicadores = await Caixa.obterIndicadoresFinanceiros();
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
