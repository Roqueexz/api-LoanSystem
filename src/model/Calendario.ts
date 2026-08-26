import logger from "../services/Logger.js";
import { formatarDataISO } from '../services/Utilitario.js';
import { DatabaseModel } from "./DatabaseModel.js";

const database = new DatabaseModel().pool;

export default class Calendario {

    private static montarRangeMes(data?: string): { inicio: string; fim: string } {
        const referencia = data ? new Date(data) : new Date();
        const primeiroDiaMes = new Date(referencia.getFullYear(), referencia.getMonth(), 1);
        const ultimoDiaMes = new Date(referencia.getFullYear(), referencia.getMonth() + 1, 0);

        return {
            inicio: formatarDataISO(primeiroDiaMes),
            fim: formatarDataISO(ultimoDiaMes),
        };
    }

    private static async resolverFiltroEmprestimo(idUsuario: number): Promise<string> {
        const resultado = await database.query(`
            SELECT EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'emprestimo'
                  AND column_name = 'id_usuario'
            ) AS possui_coluna
        `);

        return resultado.rows[0]?.possui_coluna ? `AND e.id_usuario = $3` : '';
    }

    static async obterEventosCalendario(idUsuario: number, tipo?: string, data?: string): Promise<any[]> {
        try {
            const { inicio, fim } = this.montarRangeMes(data);
            const tipoEvento = tipo?.trim() || null;
            const filtroEmprestimo = await this.resolverFiltroEmprestimo(idUsuario);

            const queryEventos = `
                SELECT
                    tipo_evento,
                    data_evento,
                    valor,
                    descricao,
                    color,
                    categoria,
                    prioridade,
                    metadata
                FROM (
                    SELECT
                        'parcela' AS tipo_evento,
                        TO_CHAR(p.data_vencimento, 'YYYY-MM-DD') AS data_evento,
                        p.valor_esperado::numeric AS valor,
                        CONCAT('Parcela ', p.numero_parcela, ' - ', 'Empréstimo #', e.id_emprestimo) AS descricao,
                        'blue' AS color,
                        'recebimento' AS categoria,
                        NULL AS prioridade,
                        jsonb_build_object(
                            'id_parcela', p.id_parcela,
                            'numero_parcela', p.numero_parcela,
                            'id_emprestimo', e.id_emprestimo
                        ) AS metadata
                    FROM Parcela p
                    JOIN Emprestimo e ON p.id_emprestimo = e.id_emprestimo
                    WHERE p.data_vencimento BETWEEN $1 AND $2
                      AND e.status_emprestimo = TRUE
                      ${filtroEmprestimo}

                    UNION ALL

                    SELECT
                        'conta' AS tipo_evento,
                        TO_CHAR(c.vencimento, 'YYYY-MM-DD') AS data_evento,
                        c.valor::numeric AS valor,
                        c.descricao AS descricao,
                        'red' AS color,
                        COALESCE(c.categoria, 'financeira') AS categoria,
                        c.prioridade AS prioridade,
                        jsonb_build_object('id_conta', c.id_conta, 'status', c.status) AS metadata
                    FROM caixa_pessoal_conta c
                    WHERE c.vencimento BETWEEN $1 AND $2
                      AND c.id_usuario = $3
                      AND c.status IN ('pendente', 'programada', 'atrasada')

                    UNION ALL

                    SELECT
                        'meta' AS tipo_evento,
                        TO_CHAR(m.prazo, 'YYYY-MM-DD') AS data_evento,
                        m.valor_alvo::numeric AS valor,
                        m.nome AS descricao,
                        'green' AS color,
                        'meta' AS categoria,
                        NULL AS prioridade,
                        jsonb_build_object('id_meta', m.id_meta, 'valor_atual', m.valor_atual) AS metadata
                    FROM caixa_pessoal_meta m
                    WHERE m.prazo BETWEEN $1 AND $2
                      AND m.id_usuario = $3
                      AND m.prazo IS NOT NULL
                ) AS eventos
                WHERE ($4::text IS NULL OR tipo_evento = $4)
                ORDER BY data_evento, tipo_evento;
            `;

            const params = [inicio, fim, idUsuario, tipoEvento];
            const resultado = await database.query(queryEventos, params);

            return resultado.rows.map((row: any) => ({
                ...row,
                valor: Number(row.valor),
                metadata: row.metadata ?? null,
            }));
        } catch (error) {
            logger.error({ error, idUsuario, tipo, data }, '[CalendarioModel] Erro ao obter eventos do calendário');
            throw error;
        }
    }

    static async previsualizarEventosMes(idUsuario: number, anoMes?: string): Promise<any[]> {
        try {
            const dataAtual = new Date();
            const ano = anoMes ? Number(anoMes.split('-')[0]) : dataAtual.getFullYear();
            const mes = anoMes ? Number(anoMes.split('-')[1]) : dataAtual.getMonth() + 1;

            const primeiroDia = new Date(ano, mes - 1, 1);
            const ultimoDia = new Date(ano, mes, 0);

            const dataInicio = formatarDataISO(primeiroDia);
            const dataFim = formatarDataISO(ultimoDia);

            const filtroEmprestimo = await this.resolverFiltroEmprestimo(idUsuario);

            const queryPrevisualizacao = `
                SELECT
                    data_evento,
                    COUNT(*) AS total_eventos,
                    SUM(valor) AS total_valor,
                    ARRAY_AGG(tipo_evento) AS tipos
                FROM (
                    SELECT
                        TO_CHAR(p.data_vencimento, 'YYYY-MM-DD') AS data_evento,
                        p.valor_esperado::numeric AS valor,
                        'parcela' AS tipo_evento
                    FROM Parcela p
                    JOIN Emprestimo e ON p.id_emprestimo = e.id_emprestimo
                    WHERE p.data_vencimento BETWEEN $1 AND $2
                      AND e.status_emprestimo = TRUE
                      ${filtroEmprestimo}

                    UNION ALL

                    SELECT
                        TO_CHAR(c.vencimento, 'YYYY-MM-DD') AS data_evento,
                        c.valor::numeric AS valor,
                        'conta' AS tipo_evento
                    FROM caixa_pessoal_conta c
                    WHERE c.vencimento BETWEEN $1 AND $2
                      AND c.id_usuario = $3
                      AND c.status IN ('pendente', 'programada', 'atrasada')

                    UNION ALL

                    SELECT
                        TO_CHAR(m.prazo, 'YYYY-MM-DD') AS data_evento,
                        m.valor_alvo::numeric AS valor,
                        'meta' AS tipo_evento
                    FROM caixa_pessoal_meta m
                    WHERE m.prazo BETWEEN $1 AND $2
                      AND m.id_usuario = $3
                      AND m.prazo IS NOT NULL
                ) AS eventos
                GROUP BY data_evento
                ORDER BY data_evento
            `;

            const resultado = await database.query(queryPrevisualizacao, [dataInicio, dataFim, idUsuario]);

            return resultado.rows.map((row: any) => ({
                ...row,
                total_eventos: Number(row.total_eventos),
                total_valor: Number(row.total_valor),
                tipos: row.tipos ?? [],
            }));
        } catch (error) {
            logger.error({ error, idUsuario, anoMes }, '[CalendarioModel] Erro ao previsualizar eventos do mês');
            throw error;
        }
    }

    static async criarEvento(data: any): Promise<any> {
        try {
            return { sucesso: true };
        } catch (error) {
            logger.error({ error }, '[CalendarioModel] Erro ao criar evento');
            throw error;
        }
    }

    static async atualizarRegraCalendario(tipo: string, dataKey: string, hasRule: boolean): Promise<any> {
        try {
            return { sucesso: true };
        } catch (error) {
            logger.error({ error }, '[CalendarioModel] Erro ao atualizar regra de calendário');
            throw error;
        }
    }
}