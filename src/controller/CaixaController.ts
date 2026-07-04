import { type Request, type Response } from "express";
import Caixa from "../model/Caixa.js";

export default class CaixaController {
    static async resumo(req: Request, res: Response) {
        try {
            const resumoFinanceiro = await Caixa.obterResumoFinanceiro();

            res.status(200).json(resumoFinanceiro);
        } catch (error) {
            console.error("[CaixaController] Erro ao obter resumo financeiro:", error);

            res.status(500).json({
                mensagem: "Erro interno ao recuperar o resumo financeiro."
            });
        }
    }
}