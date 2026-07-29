// api/src/model/CaixaPessoal.ts
import type { 
  CofreFisicoDTO, 
  CedulaCofreDTO, 
  MovimentacaoDTO,
  ContaDTO
} from '../interface/CaixaPessoalDTO.js';
import databaseInstance from './DatabaseModel.js';
import logger from '../services/Logger.js';

const database = databaseInstance.pool;

// Cédulas válidas — imutável, definido uma vez
const CEDULAS_VALIDAS = [200, 100, 50, 20, 10, 5, 2];

export default class CaixaPessoal {

    // ─── COFRE: OBTER ──────────────────────────────────────────────────
    static async obterCofre(id_usuario: number): Promise<CofreFisicoDTO> {
        try {
            const query = `
                SELECT valor_cedula, quantidade
                FROM caixa_pessoal_cofre
                WHERE id_usuario = $1
                ORDER BY valor_cedula DESC
            `;
            const resultado = await database.query(query, [id_usuario]);

            const registros = new Map<number, number>(
                resultado.rows.map((r: any) => [Number(r.valor_cedula), Number(r.quantidade)])
            );

            const cedulas: CedulaCofreDTO[] = CEDULAS_VALIDAS.map((valor) => ({
                valor_cedula: valor,
                quantidade: registros.get(valor) ?? 0,
            }));

            const total = cedulas.reduce(
                (acc, c) => acc + c.valor_cedula * c.quantidade,
                0
            );

            logger.info({ id_usuario, total }, '[CaixaPessoal] Cofre obtido');

            return { cedulas, total };

        } catch (error) {
            logger.error({ error, id_usuario }, '[CaixaPessoal] Erro ao obter cofre');
            throw error;
        }
    }

    // ─── COFRE: ATUALIZAR CÉDULA ───────────────────────────────────────
    static async atualizarCedula(
        id_usuario: number,
        valor_cedula: number,
        quantidade: number
    ): Promise<CedulaCofreDTO> {
        if (!CEDULAS_VALIDAS.includes(valor_cedula)) {
            throw new Error(`Cédula inválida: ${valor_cedula}`);
        }

        if (quantidade < 0) {
            throw new Error('Quantidade não pode ser negativa');
        }

        try {
            const query = `
                INSERT INTO caixa_pessoal_cofre (id_usuario, valor_cedula, quantidade, atualizado_em)
                VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
                ON CONFLICT (id_usuario, valor_cedula)
                DO UPDATE SET
                    quantidade = EXCLUDED.quantidade,
                    atualizado_em = CURRENT_TIMESTAMP
                RETURNING valor_cedula, quantidade
            `;
            const resultado = await database.query(query, [
                id_usuario,
                valor_cedula,
                quantidade,
            ]);

            const cedula = resultado.rows[0];

            logger.info(
                { id_usuario, valor_cedula, quantidade },
                '[CaixaPessoal] Cédula atualizada'
            );

            return {
                valor_cedula: Number(cedula.valor_cedula),
                quantidade: Number(cedula.quantidade),
            };

        } catch (error) {
            logger.error(
                { error, id_usuario, valor_cedula, quantidade },
                '[CaixaPessoal] Erro ao atualizar cédula'
            );
            throw error;
        }
    }

    // ─── MOVIMENTAÇÕES: LISTAR ─────────────────────────────────────────
    static async listarMovimentacoes(
        id_usuario: number,
        filtros?: { tipo?: string; categoria?: string }
    ): Promise<MovimentacaoDTO[]> {
        try {
            let query = `
                SELECT id_movimentacao, tipo, valor, categoria, descricao, 
                       TO_CHAR(data, 'YYYY-MM-DD') as data, criado_em
                FROM caixa_pessoal_movimentacao
                WHERE id_usuario = $1
            `;
            const params: any[] = [id_usuario];

            if (filtros?.tipo) {
                params.push(filtros.tipo);
                query += ` AND tipo = $${params.length}`;
            }

            if (filtros?.categoria) {
                params.push(`%${filtros.categoria}%`);
                query += ` AND categoria ILIKE $${params.length}`;
            }

            query += ` ORDER BY data DESC, criado_em DESC`;

            const resultado = await database.query(query, params);

            return resultado.rows.map((row: any) => ({
                id_movimentacao: row.id_movimentacao,
                tipo: row.tipo,
                valor: Number(row.valor),
                categoria: row.categoria,
                descricao: row.descricao,
                data: row.data,
            }));
        } catch (error) {
            logger.error({ error, id_usuario }, '[CaixaPessoal] Erro ao listar movimentações');
            throw error;
        }
    }

    // ─── MOVIMENTAÇÕES: CRIAR ──────────────────────────────────────────
    static async criarMovimentacao(
        id_usuario: number,
        dados: Omit<MovimentacaoDTO, 'id_movimentacao'>
    ): Promise<MovimentacaoDTO> {
        const { tipo, valor, categoria, descricao, data } = dados;

        if (!['entrada', 'saida'].includes(tipo)) {
            throw new Error('Tipo de movimentação inválido.');
        }

        if (valor <= 0) {
            throw new Error('Valor da movimentação deve ser maior que zero.');
        }

        try {
            const query = `
                INSERT INTO caixa_pessoal_movimentacao 
                    (id_usuario, tipo, valor, categoria, descricao, data)
                VALUES ($1, $2, $3, $4, $5, COALESCE($6::date, CURRENT_DATE))
                RETURNING id_movimentacao, tipo, valor, categoria, descricao, 
                          TO_CHAR(data, 'YYYY-MM-DD') as data
            `;
            const resultado = await database.query(query, [
                id_usuario,
                tipo,
                valor,
                categoria,
                descricao || null,
                data || null,
            ]);

            const row = resultado.rows[0];

            logger.info(
                { id_usuario, id_movimentacao: row.id_movimentacao },
                '[CaixaPessoal] Movimentação registrada'
            );

            return {
                id_movimentacao: row.id_movimentacao,
                tipo: row.tipo,
                valor: Number(row.valor),
                categoria: row.categoria,
                descricao: row.descricao,
                data: row.data,
            };
        } catch (error) {
            logger.error({ error, id_usuario, dados }, '[CaixaPessoal] Erro ao criar movimentação');
            throw error;
        }
    }

    // ─── MOVIMENTAÇÕES: REMOVER ────────────────────────────────────────
    static async removerMovimentacao(
        id_usuario: number,
        id_movimentacao: number
    ): Promise<boolean> {
        try {
            const query = `
                DELETE FROM caixa_pessoal_movimentacao
                WHERE id_movimentacao = $1 AND id_usuario = $2
                RETURNING id_movimentacao
            `;
            const resultado = await database.query(query, [id_movimentacao, id_usuario]);

            const deletado = (resultado.rowCount ?? 0) > 0;

            if (deletado) {
                logger.info({ id_usuario, id_movimentacao }, '[CaixaPessoal] Movimentação removida');
            }

            return deletado;
        } catch (error) {
            logger.error(
                { error, id_usuario, id_movimentacao },
                '[CaixaPessoal] Erro ao remover movimentação'
            );
            throw error;
        }
    }

    // ─── CONTAS: LISTAR ───────────────────────────────────────────────
    static async listarContas(
        id_usuario: number
    ): Promise<ContaDTO[]> {
        try {
            const query = `
                SELECT id_conta, tipo, descricao, valor, vencimento, pago, categoria, recorrencia, lembrete_dias_antes, observacao, status, criado_em
                FROM caixa_pessoal_conta
                WHERE id_usuario = $1
                ORDER BY vencimento ASC, criado_em DESC
            `;
            const resultado = await database.query(query, [id_usuario]);

            return resultado.rows.map((row: any) => ({
                id_conta: row.id_conta,
                tipo: row.tipo,
                descricao: row.descricao,
                valor: Number(row.valor),
                vencimento: row.vencimento instanceof Date ? row.vencimento.toISOString().split('T')[0] : row.vencimento,
                pago: Boolean(row.pago),
                    categoria: row.categoria ?? null,
                    recorrencia: row.recorrencia ?? 'nenhuma',
                    lembrete_dias_antes: row.lembrete_dias_antes !== undefined ? Number(row.lembrete_dias_antes) : undefined,
                    observacao: row.observacao ?? null,
                    status: row.status ?? (row.pago ? 'paga' : 'pendente'),
                }));
        } catch (error) {
            logger.error({ error, id_usuario }, '[CaixaPessoal] Erro ao listar contas');
            throw error;
        }
    }

    // ─── CONTAS: CRIAR ────────────────────────────────────────────────
    static async criarConta(
        id_usuario: number,
        dados: { tipo: 'pagar' | 'receber'; descricao: string; valor: number; vencimento: string; pago?: boolean; categoria?: string; recorrencia?: 'nenhuma' | 'diaria' | 'semanal' | 'mensal' | 'anual'; lembrete_dias_antes?: number; observacao?: string; status?: 'pendente' | 'paga' | 'programada' | 'cancelada' }
    ): Promise<ContaDTO> {
        const { tipo, descricao, valor, vencimento } = dados;

        if (!['pagar', 'receber'].includes(tipo)) {
            throw new Error('Tipo de conta inválido.');
        }

        if (!descricao || String(descricao).trim() === '') {
            throw new Error('Descrição é obrigatória.');
        }

        if (valor <= 0) {
            throw new Error('Valor da conta deve ser maior que zero.');
        }

        try {
            const query = `
                INSERT INTO caixa_pessoal_conta (id_usuario, tipo, descricao, valor, vencimento, categoria, recorrencia, lembrete_dias_antes, observacao, status)
                VALUES ($1, $2, $3, $4, $5::date, $6, $7, $8, $9, COALESCE($10, 'pendente'))
                RETURNING id_conta, tipo, descricao, valor, TO_CHAR(vencimento, 'YYYY-MM-DD') as vencimento, pago, categoria, recorrencia, lembrete_dias_antes, observacao, status
            `;
            const resultado = await database.query(query, [
                id_usuario,
                tipo,
                descricao,
                valor,
                vencimento,
                dados.categoria ?? null,
                dados.recorrencia ?? 'nenhuma',
                dados.lembrete_dias_antes ?? null,
                dados.observacao ?? null,
                dados.status ?? null,
            ]);

            const row = resultado.rows[0];

            logger.info({ id_usuario, id_conta: row.id_conta }, '[CaixaPessoal] Conta criada');

            return {
                id_conta: row.id_conta,
                tipo: row.tipo,
                descricao: row.descricao,
                valor: Number(row.valor),
                vencimento: row.vencimento,
                pago: Boolean(row.pago),
                categoria: row.categoria ?? null,
                recorrencia: row.recorrencia ?? 'nenhuma',
                lembrete_dias_antes: row.lembrete_dias_antes !== undefined ? Number(row.lembrete_dias_antes) : undefined,
                observacao: row.observacao ?? null,
                status: row.status ?? (row.pago ? 'paga' : 'pendente'),
            };
        } catch (error) {
            logger.error({ error, id_usuario, dados }, '[CaixaPessoal] Erro ao criar conta');
            throw error;
        }
    }

    // ─── CONTAS: PAGAR ────────────────────────────────────────────────
    static async pagarConta(
        id_usuario: number,
        id_conta: number
    ): Promise<boolean> {
        try {
            const query = `
                UPDATE caixa_pessoal_conta
                SET pago = TRUE, status = 'paga'
                WHERE id_conta = $1 AND id_usuario = $2
                RETURNING id_conta
            `;
            const resultado = await database.query(query, [id_conta, id_usuario]);

            const atualizado = (resultado.rowCount ?? 0) > 0;

            if (atualizado) {
                logger.info({ id_usuario, id_conta }, '[CaixaPessoal] Conta marcada como paga');
            }

            return atualizado;
        } catch (error) {
            logger.error({ error, id_usuario, id_conta }, '[CaixaPessoal] Erro ao pagar conta');
            throw error;
        }
    }

    // ─── CONTAS: REMOVER ─────────────────────────────────────────────
    static async removerConta(
        id_usuario: number,
        id_conta: number
    ): Promise<boolean> {
        try {
            const query = `
                DELETE FROM caixa_pessoal_conta
                WHERE id_conta = $1 AND id_usuario = $2
                RETURNING id_conta
            `;
            const resultado = await database.query(query, [id_conta, id_usuario]);

            const deletado = (resultado.rowCount ?? 0) > 0;

            if (deletado) {
                logger.info({ id_usuario, id_conta }, '[CaixaPessoal] Conta removida');
            }

            return deletado;
        } catch (error) {
            logger.error({ error, id_usuario, id_conta }, '[CaixaPessoal] Erro ao remover conta');
            throw error;
        }
    }
}
