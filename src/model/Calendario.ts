import databaseInstance from "./DatabaseModel.js";
import logger from "../services/Logger.js";
import { formatarDataISO } from '../services/Utilitario.js';

const database = databaseInstance.pool;

export default class Calendario {

    static async obterEventosCalendario(tipo?: string, data?: string): Promise<any[]> {
        try {
            const dataAtual = new Date();
            const primeiroDiaMes = new Date(dataAtual.getFullYear(), dataAtual.getMonth(), 1);
            const ultimoDiaMes = new Date(dataAtual.getFullYear(), dataAtual.getMonth() + 1, 0);
            
            const dataInicio = formatarDataISO(primeiroDiaMes);
            const dataFim = formatarDataISO(ultimoDiaMes);

            // Query para eventos do calendário
            const queryEventos = `
                SELECT 
                    'parcela' AS tipo_evento,
                    p.data_vencimento AS data_evento,
                    p.valor_esperado AS valor,
                    'Parcela de empréstimo' AS descricao,
                    'blue' AS color
                FROM Parcela p
                JOIN Emprestimo e ON p.id_emprestimo = e.id_emprestimo
                WHERE p.data_vencimento BETWEEN $1 AND $2
                AND e.status_emprestimo = TRUE
                
                UNION ALL
                
                SELECT 
                    'conta' AS tipo_evento,
                    c.data_vencimento AS data_evento,
                    c.valor_conta AS valor,
                    c.descricao AS descricao,
                    'red' AS color
                FROM Conta c
                WHERE c.data_vencimento BETWEEN $1 AND $2
                AND c.status_conta IN ('pendente', 'programada')
                
                UNION ALL
                
                SELECT 
                    'meta' AS tipo_evento,
                    m.data_limite AS data_evento,
                    m.valor_meta AS valor,
                    m.descricao AS descricao,
                    'green' AS color
                FROM Meta m
                WHERE m.data_limite BETWEEN $1 AND $2
                AND m.status_meta = 'ativa'
            `;

            const params = [dataInicio, dataFim];
            const resultado = await database.query(queryEventos, params);
            
            return resultado.rows;
        } catch (error) {
            logger.error({ error, tipo, data }, '[CalendarioModel] Erro ao obter eventos do calendário');
            throw error;
        }
    }

    static async previsualizarEventosMes(anoMes?: string): Promise<any[]> {
        try {
            const dataAtual = new Date();
            const ano = anoMes ? Number(anoMes.split('-')[0]) : dataAtual.getFullYear();
            const mes = anoMes ? Number(anoMes.split('-')[1]) : dataAtual.getMonth() + 1;
            
            const primeiroDia = new Date(ano, mes - 1, 1);
            const ultimoDia = new Date(ano, mes, 0);
            
            const dataInicio = formatarDataISO(primeiroDia);
            const dataFim = formatarDataISO(ultimoDia);

            // Query para previsualização do mês
            const queryPrevisualizacao = `
                SELECT 
                    data_evento,
                    COUNT(*) AS total_eventos,
                    SUM(valor) AS total_valor,
                    ARRAY_AGG(tipo_evento) AS tipos
                FROM (
                    SELECT 
                        p.data_vencimento AS data_evento,
                        p.valor_esperado AS valor,
                        'parcela' AS tipo_evento
                    FROM Parcela p
                    JOIN Emprestimo e ON p.id_emprestimo = e.id_emprestimo
                    WHERE p.data_vencimento BETWEEN $1 AND $2
                    AND e.status_emprestimo = TRUE
                    
                    UNION ALL
                    
                    SELECT 
                        c.data_vencimento AS data_evento,
                        c.valor_conta AS valor,
                        'conta' AS tipo_evento
                    FROM Conta c
                    WHERE c.data_vencimento BETWEEN $1 AND $2
                    AND c.status_conta IN ('pendente', 'programada')
                    
                    UNION ALL
                    
                    SELECT 
                        m.data_limite AS data_evento,
                        m.valor_meta AS valor,
                        'meta' AS tipo_evento
                    FROM Meta m
                    WHERE m.data_limite BETWEEN $1 AND $2
                    AND m.status_meta = 'ativa'
                ) AS eventos
                GROUP BY data_evento
                ORDER BY data_evento
            `;

            const resultado = await database.query(queryPrevisualizacao, [dataInicio, dataFim]);
            
            return resultado.rows;
        } catch (error) {
            logger.error({ error, anoMes }, '[CalendarioModel] Erro ao previsualizar eventos do mês');
            throw error;
        }
    }

    static async criarEvento(data: any): Promise<any> {
        try {
            // Lógica para criar eventos personalizados
            // Será implementado futuramente
            return { sucesso: true };
        } catch (error) {
            logger.error({ error }, '[CalendarioModel] Erro ao criar evento');
            throw error;
        }
    }

    static async atualizarRegraCalendario(tipo: string, dataKey: string, hasRule: boolean): Promise<any> {
        try {
            // Lógica para atualizar regras de calendário
            // Será implementado futuramente
            return { sucesso: true };
        } catch (error) {
            logger.error({ error }, '[CalendarioModel] Erro ao atualizar regra de calendário');
            throw error;
        }
    }
}