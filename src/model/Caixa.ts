import type CaixaDTO from "../interface/CaixaDTO.js";
import databaseInstance from "./DatabaseModel.js";
import logger from "../services/Logger.js";

const database = databaseInstance.pool;

export default class Caixa {

    static async obterResumoFinanceiro(): Promise<CaixaDTO> {
        try {
            // 1. Total emprestado (soma de todos os emprestimos ativos)
            const queryTotalEmprestado = `
                SELECT COALESCE(SUM(valor_emprestimo), 0) AS total
                FROM Emprestimo
                WHERE status_emprestimo = TRUE
            `;
            const resEmprestado = await database.query(queryTotalEmprestado);
            const totalEmprestado = Number(resEmprestado.rows[0]?.total || 0);

            // 2. Total recebido (soma de todas as parcelas pagas)
            const queryTotalRecebido = `
                SELECT COALESCE(SUM(valor_pago), 0) AS total
                FROM Parcela
                WHERE status_parcela = 'pago'
            `;
            const resRecebido = await database.query(queryTotalRecebido);
            const totalRecebido = Number(resRecebido.rows[0]?.total || 0);

            // 3. Total pendente (parcelas com status 'pendente')
            const queryPendente = `
                SELECT COALESCE(SUM(valor_esperado - valor_pago), 0) AS total
                FROM Parcela
                WHERE status_parcela = 'pendente'
            `;
            const resPendente = await database.query(queryPendente);
            const entradaPendente = Number(resPendente.rows[0]?.total || 0);

            // 4. Total atrasado (parcelas vencidas e nao pagas)
            const queryAtrasado = `
                SELECT COALESCE(SUM(valor_esperado - valor_pago), 0) AS total
                FROM Parcela
                WHERE status_parcela = 'pendente'
                AND data_vencimento < CURRENT_DATE
            `;
            const resAtrasado = await database.query(queryAtrasado);
            const totalAtrasado = Number(resAtrasado.rows[0]?.total || 0);

            // 5. Lucro previsto (juros futuros sobre parcelas pendentes)
            // Calcula o lucro como a diferenca entre o valor esperado e o valor emprestado
            // Para cada emprestimo ativo, soma (valor_parcela * num_parcelas - valor_emprestimo)
            const queryLucro = `
                SELECT COALESCE(SUM(
                    (e.valor_parcela * e.num_parcelas) - e.valor_emprestimo
                ), 0) AS total
                FROM Emprestimo e
                WHERE e.status_emprestimo = TRUE
            `;
            const resLucro = await database.query(queryLucro);
            const lucroPrevisto = Number(resLucro.rows[0]?.total || 0);

            // 6. Total de clientes ativos
            const queryClientes = `
                SELECT COUNT(*) AS total
                FROM Cliente
                WHERE status_cliente = TRUE
            `;
            const resClientes = await database.query(queryClientes);
            const totalClientes = Number(resClientes.rows[0]?.total || 0);

            // 7. Total de emprestimos ativos
            const queryEmprestimos = `
                SELECT COUNT(*) AS total
                FROM Emprestimo
                WHERE status_emprestimo = TRUE
            `;
            const resEmprestimos = await database.query(queryEmprestimos);
            const totalEmprestimos = Number(resEmprestimos.rows[0]?.total || 0);

            logger.info({
                totalEmprestado,
                totalRecebido,
                entradaPendente,
                lucroPrevisto,
                totalClientes,
                totalEmprestimos,
                totalAtrasado
            }, 'Resumo financeiro calculado com sucesso');

            return {
                totalEmprestado,
                totalRecebido,
                entradaPendente,
                lucroPrevisto,
                totalClientes,
                totalEmprestimos,
                totalAtrasado,
            };

        } catch (error) {
            logger.error({ error }, '[CaixaModel] Erro ao gerar resumo financeiro');
            throw error;
        }
    }

}