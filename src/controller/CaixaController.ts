import { type Request, type Response } from "express";
import Caixa from "../model/Caixa.js";
import logger from "../services/Logger.js";

export default class CaixaController {
    static async resumo(req: Request, res: Response) {
        try {
            const resumoFinanceiro = await Caixa.obterResumoFinanceiro();
            res.status(200).json(resumoFinanceiro);
        } catch (error) {
            logger.error({ error }, "[CaixaController] Erro ao obter resumo financeiro");
            res.status(500).json({
                mensagem: "Erro interno ao recuperar o resumo financeiro."
            });
        }
    }

    static async relatorioDiario(req: Request, res: Response) {
        try {
            const { data } = req.query;
            const relatorio = await Caixa.obterRelatorioDiario(data as string);
            res.status(200).json(relatorio);
        } catch (error) {
            logger.error({ error }, "[CaixaController] Erro ao obter relatorio diario");
            res.status(500).json({
                mensagem: "Erro interno ao recuperar o relatorio diario."
            });
        }
    }

    static async relatorioMensal(req: Request, res: Response) {
        try {
            const { ano, mes } = req.query;
            const relatorio = await Caixa.obterRelatorioMensal(
                ano ? Number(ano) : undefined,
                mes ? Number(mes) : undefined
            );
            res.status(200).json(relatorio);
        } catch (error) {
            logger.error({ error }, "[CaixaController] Erro ao obter relatorio mensal");
            res.status(500).json({
                mensagem: "Erro interno ao recuperar o relatorio mensal."
            });
        }
    }

    static async relatorioAnual(req: Request, res: Response) {
        try {
            const { ano } = req.query;
            const relatorio = await Caixa.obterRelatorioAnual(ano ? Number(ano) : undefined);
            res.status(200).json(relatorio);
        } catch (error) {
            logger.error({ error }, "[CaixaController] Erro ao obter relatorio anual");
            res.status(500).json({
                mensagem: "Erro interno ao recuperar o relatorio anual."
            });
        }
    }
}