import type CaixaDTO from "../interface/CaixaDTO.js";
import { DatabaseModel } from "./DatabaseModel.js";

const database = new DatabaseModel().pool;

export default class Caixa {

    static async obterResumoFinanceiro(): Promise<CaixaDTO> {
        try {

            /*
             * Os cálculos serão implementados
             * na próxima sprint.
             */

            return {
                totalEmprestado: 0,
                totalRecebido: 0,
                entradaPendente: 0,
                lucroPrevisto: 0,
            };

        } catch (error) {
            console.error(
                "[CaixaModel] Erro ao gerar resumo financeiro:",
                error
            );

            throw error;
        }
    }

}