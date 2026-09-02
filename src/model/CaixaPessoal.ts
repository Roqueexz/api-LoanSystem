// api/src/model/CaixaPessoal.ts
import type { 
  CofreFisicoDTO, 
  CedulaCofreDTO, 
  MovimentacaoDTO,
  ContaDTO,
  MetaDTO,
} from '../interface/CaixaPessoalDTO.js';
import logger from '../services/Logger.js';
import { DatabaseModel } from "./DatabaseModel.js";

const database = new DatabaseModel().pool;

// Cédulas válidas — imutável, definido uma vez
const CEDULAS_VALIDAS = [200, 100, 50, 20, 10, 5, 2];

export default class CaixaPessoal {

    // ─── COFRE: OBTER ──────────────────────────────────────────────────
    static async obterCofre(id_usuario: number): Promise<CofreFisicoDTO> {
        if (!id_usuario || isNaN(Number(id_usuario))) {
            logger.error({ id_usuario }, '[CaixaPessoal] obterCofre chamado com id_usuario inválido');
            throw new Error('id_usuario inválido');
        }
        try {
            // Auto-migração defensiva: se a tabela ainda não existe no Supabase (init.sql não rodado),
            // esta query evita o 500 "relation does not exist" que causa o Erro interno ao recuperar o cofre.
            await database.query(`
                CREATE TABLE IF NOT EXISTS caixa_pessoal_cofre (
                    id_cofre      SERIAL PRIMARY KEY,
                    id_usuario    INT          NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
                    valor_cedula  NUMERIC(6,2) NOT NULL,
                    quantidade    INT          NOT NULL DEFAULT 0 CHECK (quantidade >= 0),
                    atualizado_em TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE (id_usuario, valor_cedula)
                )
            `);
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

    // ─── SALDO CONSOLIDADO: OBTER (CAIXINHAS + CAIXA PESSOAL / COFRE) ──
    static async obterSaldo(id_usuario: number): Promise<number> {
        try {
            await database.query(`
                CREATE TABLE IF NOT EXISTS caixinha_pessoal (
                    id_caixinha SERIAL PRIMARY KEY,
                    id_usuario INT NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
                    nome VARCHAR(100) NOT NULL,
                    saldo NUMERIC(10,2) NOT NULL DEFAULT 0.00,
                    meta NUMERIC(10,2),
                    emoji VARCHAR(10) DEFAULT '🐷',
                    cor VARCHAR(20) DEFAULT 'indigo',
                    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
            const resCaixinhas = await database.query(
                `SELECT COALESCE(SUM(saldo), 0) as total FROM caixinha_pessoal WHERE id_usuario = $1`,
                [id_usuario]
            );
            const totalCaixinhas = Number(resCaixinhas.rows[0]?.total || 0);

            const cofre = await CaixaPessoal.obterCofre(id_usuario).catch(() => ({ total: 0, cedulas: [] }));
            const totalCofre = Number(cofre?.total || 0);

            return totalCaixinhas + totalCofre;
        } catch (error) {
            logger.warn({ error, id_usuario }, '[CaixaPessoal] Aviso ao obter saldo consolidado');
            return 0;
        }
    }

    // ─── SALDO CONSOLIDADO: ATUALIZAR ──────────────────────────────────
    static async atualizarSaldo(id_usuario: number, saldo: number): Promise<boolean> {
        try {
            await database.query(`
                CREATE TABLE IF NOT EXISTS caixa_pessoal (
                    id_usuario INT PRIMARY KEY REFERENCES usuario(id_usuario) ON DELETE CASCADE,
                    saldo NUMERIC(10,2) NOT NULL DEFAULT 0.00,
                    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
            const query = `
                INSERT INTO caixa_pessoal (id_usuario, saldo, atualizado_em)
                VALUES ($1, $2, CURRENT_TIMESTAMP)
                ON CONFLICT (id_usuario)
                DO UPDATE SET
                    saldo = EXCLUDED.saldo,
                    atualizado_em = CURRENT_TIMESTAMP
                RETURNING saldo
            `;
            const resultado = await database.query(query, [id_usuario, saldo]);
            const atualizado = (resultado.rowCount ?? 0) > 0;

            if (atualizado) {
                logger.info({ id_usuario, saldo }, '[CaixaPessoal] Saldo consolidado atualizado com sucesso');
            }

            return atualizado;
        } catch (error) {
            logger.error({ error, id_usuario, saldo }, '[CaixaPessoal] Erro ao atualizar saldo consolidado');
            throw error;
        }
    }

    // ─── SALDO CONSOLIDADO: RECALCULAR E SALVAR ────────────────────────
    static async recalcularESalvarSaldo(id_usuario: number): Promise<number> {
        try {
            const novoSaldo = await CaixaPessoal.obterSaldo(id_usuario);
            await CaixaPessoal.atualizarSaldo(id_usuario, novoSaldo);
            return novoSaldo;
        } catch (error) {
            logger.warn({ error, id_usuario }, '[CaixaPessoal] Erro no recálculo automático de saldo');
            return 0;
        }
    }

    // ─── MOVIMENTAÇÕES: SINCRONIZAÇÃO AUTOMÁTICA DE EMPRÉSTIMOS E PARCELAS ───────
    static async sincronizarMovimentacoesEmprestimos(id_usuario: number): Promise<void> {
        try {
            // 1. Sincronizar saídas de empréstimos concedidos
            const querySaidas = `
                INSERT INTO caixa_pessoal_movimentacao (id_usuario, tipo, valor, categoria, descricao, data)
                SELECT e.id_usuario, 'saida', e.valor_emprestimo, 'Emprestimo Concedido', 
                       CONCAT('Emprestimo concedido a ', c.nome, ' ', c.sobrenome, ' (#', e.id_emprestimo, ')'), 
                       e.data_emprestimo
                FROM Emprestimo e
                JOIN Cliente c ON e.id_cliente = c.id_cliente
                WHERE e.id_usuario = $1
                AND NOT EXISTS (
                  SELECT 1 FROM caixa_pessoal_movimentacao m
                  WHERE m.id_usuario = e.id_usuario
                  AND m.tipo = 'saida'
                  AND m.descricao LIKE CONCAT('%#', e.id_emprestimo, '%')
                )
            `;
            await database.query(querySaidas, [id_usuario]);

            // 2. Se houver empréstimos quitados (status_emprestimo = FALSE), garantir que parcelas pendentes fiquem pagas
            await database.query(`
                UPDATE Parcela
                SET status_parcela = 'pago',
                    data_pagamento = COALESCE(data_pagamento, CURRENT_DATE),
                    valor_pago = valor_esperado
                WHERE id_emprestimo IN (
                    SELECT id_emprestimo FROM Emprestimo WHERE id_usuario = $1 AND status_emprestimo = FALSE
                )
                AND (LOWER(status_parcela) != 'pago' AND LOWER(status_parcela) != 'paga' AND data_pagamento IS NULL)
            `, [id_usuario]);

            // 3. Sincronizar entradas de parcelas pagas
            const queryEntradas = `
                INSERT INTO caixa_pessoal_movimentacao (id_usuario, tipo, valor, categoria, descricao, data)
                SELECT e.id_usuario, 'entrada', COALESCE(p.valor_pago, p.valor_esperado), 'Emprestimo - Recebimento',
                       CONCAT('Recebimento da Parcela ', p.numero_parcela, '/', e.num_parcelas, ' do Emprestimo #', e.id_emprestimo, ' - ', c.nome, ' ', c.sobrenome),
                       COALESCE(p.data_pagamento, CURRENT_DATE)
                FROM Parcela p
                JOIN Emprestimo e ON p.id_emprestimo = e.id_emprestimo
                JOIN Cliente c ON e.id_cliente = c.id_cliente
                WHERE e.id_usuario = $1
                AND (LOWER(p.status_parcela) IN ('pago', 'paga') OR p.data_pagamento IS NOT NULL)
                AND NOT EXISTS (
                  SELECT 1 FROM caixa_pessoal_movimentacao m
                  WHERE m.id_usuario = e.id_usuario
                  AND m.tipo = 'entrada'
                  AND m.descricao LIKE CONCAT('%Parcela ', p.numero_parcela, '/%#', e.id_emprestimo, '%')
                )
            `;
            await database.query(queryEntradas, [id_usuario]);
        } catch (error) {
            logger.warn({ error, id_usuario }, '[CaixaPessoal] Erro ao sincronizar movimentações automáticas');
        }
    }

    // ─── MOVIMENTAÇÕES: LISTAR ─────────────────────────────────────────
    static async listarMovimentacoes(
        id_usuario: number,
        filtros?: { tipo?: string; categoria?: string }
    ): Promise<MovimentacaoDTO[]> {
        try {
            // Garante que todas as entradas e saídas de empréstimos estejam registradas
            await CaixaPessoal.sincronizarMovimentacoesEmprestimos(id_usuario);

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

            // Sincroniza o saldo consolidado de forma imediata
            void CaixaPessoal.recalcularESalvarSaldo(id_usuario);

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
                // Sincroniza o saldo consolidado de forma imediata
                void CaixaPessoal.recalcularESalvarSaldo(id_usuario);
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
        id_usuario: number,
        filtros?: {
            status?: string;
            categoria?: string;
            recorrencia?: string;
            prioridade?: string;
            q?: string;
            dias?: number;
        }
    ): Promise<ContaDTO[]> {
        try {
            let query = `
                SELECT id_conta, tipo, descricao, valor, vencimento, pago, categoria, recorrencia, prioridade, lembrete_dias_antes, observacao, status, tags, criado_em
                FROM caixa_pessoal_conta
                WHERE id_usuario = $1
            `;
            const params: any[] = [id_usuario];

            if (filtros?.categoria) {
                params.push(filtros.categoria);
                query += ` AND categoria = $${params.length}`;
            }

            if (filtros?.recorrencia) {
                params.push(filtros.recorrencia);
                query += ` AND recorrencia = $${params.length}`;
            }

            if (filtros?.prioridade) {
                params.push(filtros.prioridade);
                query += ` AND prioridade = $${params.length}`;
            }

            if (filtros?.status) {
                if (filtros.status === 'atrasada') {
                    query += ` AND ((status = 'atrasada') OR ((status IN ('pendente', 'programada') OR status IS NULL) AND pago = FALSE AND vencimento < CURRENT_DATE))`;
                } else if (filtros.status === 'pendente') {
                    query += ` AND ((status = 'pendente') OR (status IS NULL AND pago = FALSE AND vencimento >= CURRENT_DATE))`;
                } else if (filtros.status === 'programada') {
                    query += ` AND ((status = 'programada') OR (status IS NULL AND pago = FALSE AND vencimento > CURRENT_DATE))`;
                } else {
                    params.push(filtros.status);
                    query += ` AND status = $${params.length}`;
                }
            }

            if (filtros?.dias !== undefined) {
                params.push(filtros.dias);
                query += ` AND vencimento BETWEEN CURRENT_DATE AND CURRENT_DATE + $${params.length}::int`;
            }

            if (filtros?.q) {
                params.push(`%${filtros.q}%`);
                query += ` AND (descricao ILIKE $${params.length} OR categoria ILIKE $${params.length} OR observacao ILIKE $${params.length} OR array_to_string(tags, ',') ILIKE $${params.length})`;
            }

            query += ` ORDER BY
                CASE
                    WHEN status = 'atrasada' THEN 0
                    WHEN status = 'pendente' THEN 1
                    WHEN status = 'programada' THEN 2
                    WHEN status = 'paga' THEN 3
                    ELSE 4
                END,
                vencimento ASC,
                criado_em DESC
            `;

            const resultado = await database.query(query, params);

            return resultado.rows.map((row: any) => {
                const vencimento = row.vencimento instanceof Date ? row.vencimento.toISOString().split('T')[0] : (row.vencimento ?? '');
                const hoje = new Date().toISOString().slice(0, 10);
                const isAtrasada = !row.pago && vencimento !== '' && vencimento < hoje && ['pendente', 'programada'].includes(row.status ?? 'pendente');
                const status = row.status ?? (row.pago ? 'paga' : 'pendente');

                const conta: ContaDTO = {
                    id_conta: row.id_conta,
                    tipo: row.tipo,
                    descricao: row.descricao,
                    valor: Number(row.valor),
                    vencimento,
                    pago: Boolean(row.pago),
                    status: isAtrasada ? 'atrasada' : status,
                };

                if (row.categoria != null) conta.categoria = row.categoria;
                conta.recorrencia = row.recorrencia === 'nenhuma' ? 'unica' : row.recorrencia ?? 'unica';
                if (row.prioridade != null) conta.prioridade = row.prioridade;
                if (row.lembrete_dias_antes !== undefined && row.lembrete_dias_antes !== null) conta.lembrete_dias_antes = Number(row.lembrete_dias_antes);
                if (row.observacao != null) conta.observacao = row.observacao;
                if (row.tags != null) conta.tags = row.tags;

                return conta;
            });
        } catch (error) {
            logger.error({ error, id_usuario, filtros }, '[CaixaPessoal] Erro ao listar contas');
            throw error;
        }
    }

    // ─── CONTAS: CRIAR ────────────────────────────────────────────────
    static async criarConta(
        id_usuario: number,
        dados: { tipo: 'pagar' | 'receber'; descricao: string; valor: number; vencimento: string; pago?: boolean; categoria?: string | undefined; recorrencia?: 'unica' | 'diaria' | 'semanal' | 'quinzenal' | 'mensal' | 'bimestral' | 'trimestral' | 'semestral' | 'anual' | undefined; prioridade?: 'alta' | 'media' | 'baixa' | undefined; lembrete_dias_antes?: number | undefined; observacao?: string | undefined; tags?: string[] | undefined; status?: 'programada' | 'pendente' | 'paga' | 'atrasada' | 'cancelada' | undefined }
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
            const dataVencimento = new Date(vencimento);
            const hoje = new Date();
            const hojeString = hoje.toISOString().slice(0, 10);
            const statusInicial = dados.status ?? (vencimento > hojeString ? 'programada' : 'pendente');

            const query = `
                INSERT INTO caixa_pessoal_conta (id_usuario, tipo, descricao, valor, vencimento, categoria, recorrencia, prioridade, tags, lembrete_dias_antes, observacao, status)
                VALUES ($1, $2, $3, $4, $5::date, $6, $7, $8, $9, $10, $11, $12)
                RETURNING id_conta, tipo, descricao, valor, TO_CHAR(vencimento, 'YYYY-MM-DD') as vencimento, pago, categoria, recorrencia, prioridade, tags, lembrete_dias_antes, observacao, status
            `;
            const resultado = await database.query(query, [
                id_usuario,
                tipo,
                descricao,
                valor,
                vencimento,
                dados.categoria ?? null,
                dados.recorrencia ?? 'unica',
                dados.prioridade ?? 'media',
                dados.tags ?? null,
                dados.lembrete_dias_antes ?? null,
                dados.observacao ?? null,
                statusInicial,
            ]);

            const row = resultado.rows[0];

            logger.info({ id_usuario, id_conta: row.id_conta }, '[CaixaPessoal] Conta criada');

            const conta: ContaDTO = {
                id_conta: row.id_conta,
                tipo: row.tipo,
                descricao: row.descricao,
                valor: Number(row.valor),
                vencimento: row.vencimento,
                pago: Boolean(row.pago),
                status: row.status ?? (row.pago ? 'paga' : 'pendente'),
            };

            if (row.categoria != null) conta.categoria = row.categoria;
            conta.recorrencia = row.recorrencia === 'nenhuma' ? 'unica' : row.recorrencia ?? 'unica';
            if (row.prioridade != null) conta.prioridade = row.prioridade;
            if (row.tags != null) conta.tags = row.tags;
            if (row.lembrete_dias_antes !== undefined && row.lembrete_dias_antes !== null) conta.lembrete_dias_antes = Number(row.lembrete_dias_antes);
            if (row.observacao != null) conta.observacao = row.observacao;

            return conta;
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
        const client = await database.connect();
        try {
            await client.query('BEGIN');

            const contaRes = await client.query(
                `SELECT tipo, descricao, valor, categoria FROM caixa_pessoal_conta WHERE id_conta = $1 AND id_usuario = $2`,
                [id_conta, id_usuario]
            );

            if (contaRes.rows.length === 0) {
                await client.query('ROLLBACK');
                return false;
            }

            const conta = contaRes.rows[0];

            const query = `
                UPDATE caixa_pessoal_conta
                SET pago = TRUE, status = 'paga'
                WHERE id_conta = $1 AND id_usuario = $2
                RETURNING id_conta
            `;
            const resultado = await client.query(query, [id_conta, id_usuario]);

            const atualizado = (resultado.rowCount ?? 0) > 0;

            if (atualizado) {
                const tipoMov = conta.tipo === 'receber' ? 'entrada' : 'saida';
                const catMov = conta.categoria || (conta.tipo === 'receber' ? 'Recebimento de Conta' : 'Pagamento de Conta');
                const descMov = `Pagamento: ${conta.descricao}`;

                await client.query(
                    `INSERT INTO caixa_pessoal_movimentacao (id_usuario, tipo, valor, categoria, descricao, data)
                     VALUES ($1, $2, $3, $4, $5, CURRENT_DATE)`,
                    [id_usuario, tipoMov, Number(conta.valor), catMov, descMov]
                );

                logger.info({ id_usuario, id_conta }, '[CaixaPessoal] Conta marcada como paga e movimentação gerada');
            }

            await client.query('COMMIT');
            if (atualizado) {
                void CaixaPessoal.recalcularESalvarSaldo(id_usuario);
            }
            return atualizado;
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error({ error, id_usuario, id_conta }, '[CaixaPessoal] Erro ao pagar conta');
            throw error;
        } finally {
            client.release();
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

        // ─── METAS: LISTAR ─────────────────────────────────────────────────
        static async listarMetas(id_usuario: number): Promise<MetaDTO[]> {
            try {
                const query = `
                    SELECT id_meta, nome, descricao, valor_alvo, valor_atual, prazo
                    FROM caixa_pessoal_meta
                    WHERE id_usuario = $1
                    ORDER BY criado_em DESC
                `;
                const resultado = await database.query(query, [id_usuario]);

                return resultado.rows.map((row: any) => {
                    const valorAlvo = Number(row.valor_alvo ?? 0);
                    const valorAtual = Number(row.valor_atual ?? 0);
                    const percentual = valorAlvo > 0 ? Number(((valorAtual / valorAlvo) * 100).toFixed(2)) : 0;
                    const prazo = row.prazo instanceof Date ? row.prazo.toISOString().split('T')[0] : row.prazo;
                    let dias_restantes: number | undefined;

                    if (prazo) {
                        const hoje = new Date();
                        hoje.setHours(0, 0, 0, 0);
                        const dataPrazo = new Date(prazo);
                        dataPrazo.setHours(0, 0, 0, 0);
                        dias_restantes = Math.max(0, Math.ceil((dataPrazo.getTime() - hoje.getTime()) / 86_400_000));
                    }

                    return {
                        id_meta: row.id_meta,
                        nome: row.nome,
                        descricao: row.descricao,
                        valor_alvo: valorAlvo,
                        valor_atual: valorAtual,
                        prazo,
                        percentual,
                        dias_restantes,
                    };
                });
            } catch (error) {
                logger.error({ error, id_usuario }, '[CaixaPessoal] Erro ao listar metas');
                throw error;
            }
        }

        // ─── METAS: CRIAR ──────────────────────────────────────────────────
        static async criarMeta(
            id_usuario: number,
            dados: Omit<MetaDTO, 'id_meta' | 'percentual' | 'dias_restantes'>
        ): Promise<MetaDTO> {
            const { nome, descricao, valor_alvo, valor_atual = 0, prazo } = dados;

            if (!nome || nome.trim() === '') {
                throw new Error('Nome da meta é obrigatório.');
            }

            if (valor_alvo <= 0) {
                throw new Error('Valor alvo deve ser maior que zero.');
            }

            if (valor_atual < 0) {
                throw new Error('Valor atual não pode ser negativo.');
            }

            try {
                const query = `
                    INSERT INTO caixa_pessoal_meta (id_usuario, nome, descricao, valor_alvo, valor_atual, prazo)
                    VALUES ($1, $2, $3, $4, $5, $6::date)
                    RETURNING id_meta, nome, descricao, valor_alvo, valor_atual, prazo
                `;
                const resultado = await database.query(query, [
                    id_usuario,
                    nome.trim(),
                    dados.descricao ?? null,
                    valor_alvo,
                    valor_atual,
                    prazo ?? null,
                ]);

                const row = resultado.rows[0];
                const percent = valor_alvo > 0 ? Number(((valor_atual / valor_alvo) * 100).toFixed(2)) : 0;
                const prazoValor = row.prazo instanceof Date ? row.prazo.toISOString().split('T')[0] : row.prazo;
                let dias_restantes: number | undefined;
                if (prazoValor) {
                    const hoje = new Date();
                    hoje.setHours(0, 0, 0, 0);
                    const dataPrazo = new Date(prazoValor);
                    dataPrazo.setHours(0, 0, 0, 0);
                    dias_restantes = Math.max(0, Math.ceil((dataPrazo.getTime() - hoje.getTime()) / 86_400_000));
                }

                return {
                    id_meta: row.id_meta,
                    nome: row.nome,
                    descricao: row.descricao,
                    valor_alvo: Number(row.valor_alvo),
                    valor_atual: Number(row.valor_atual),
                    prazo: prazoValor,
                    percentual: percent,
                    dias_restantes,
                };
            } catch (error) {
                logger.error({ error, id_usuario, dados }, '[CaixaPessoal] Erro ao criar meta');
                throw error;
            }
        }

        // ─── METAS: ATUALIZAR ──────────────────────────────────────────────
        static async atualizarMeta(
            id_usuario: number,
            id_meta: number,
            dados: Partial<Omit<MetaDTO, 'id_meta' | 'percentual' | 'dias_restantes'>>
        ): Promise<MetaDTO | null> {
            const campos: string[] = [];
            const params: any[] = [id_meta, id_usuario];

            if (dados.nome !== undefined) {
                params.push(dados.nome.trim());
                campos.push(`nome = $${params.length}`);
            }
            if (dados.descricao !== undefined) {
                params.push(dados.descricao || null);
                campos.push(`descricao = $${params.length}`);
            }
            if (dados.valor_alvo !== undefined) {
                params.push(dados.valor_alvo);
                campos.push(`valor_alvo = $${params.length}`);
            }
            if (dados.valor_atual !== undefined) {
                params.push(dados.valor_atual);
                campos.push(`valor_atual = $${params.length}`);
            }
            if (dados.prazo !== undefined) {
                params.push(dados.prazo || null);
                campos.push(`prazo = $${params.length}::date`);
            }

            if (campos.length === 0) {
                return null;
            }

            try {
                const query = `
                    UPDATE caixa_pessoal_meta
                    SET ${campos.join(', ')}
                    WHERE id_meta = $1 AND id_usuario = $2
                    RETURNING id_meta, nome, descricao, valor_alvo, valor_atual, prazo
                `;

                const resultado = await database.query(query, params);
                if (resultado.rowCount === 0) {
                    return null;
                }

                const row = resultado.rows[0];
                const valorAlvo = Number(row.valor_alvo ?? 0);
                const valorAtual = Number(row.valor_atual ?? 0);
                const percentual = valorAlvo > 0 ? Number(((valorAtual / valorAlvo) * 100).toFixed(2)) : 0;
                const prazo = row.prazo instanceof Date ? row.prazo.toISOString().split('T')[0] : row.prazo;
                let dias_restantes: number | undefined;
                if (prazo) {
                    const hoje = new Date();
                    hoje.setHours(0, 0, 0, 0);
                    const dataPrazo = new Date(prazo);
                    dataPrazo.setHours(0, 0, 0, 0);
                    dias_restantes = Math.max(0, Math.ceil((dataPrazo.getTime() - hoje.getTime()) / 86_400_000));
                }

                return {
                    id_meta: row.id_meta,
                    nome: row.nome,
                    descricao: row.descricao,
                    valor_alvo: valorAlvo,
                    valor_atual: valorAtual,
                    prazo,
                    percentual,
                    dias_restantes,
                };
            } catch (error) {
                logger.error({ error, id_usuario, id_meta, dados }, '[CaixaPessoal] Erro ao atualizar meta');
                throw error;
            }
        }

        // ─── METAS: REMOVER ────────────────────────────────────────────────
        static async removerMeta(id_usuario: number, id_meta: number): Promise<boolean> {
            try {
                const query = `
                    DELETE FROM caixa_pessoal_meta
                    WHERE id_meta = $1 AND id_usuario = $2
                    RETURNING id_meta
                `;
                const resultado = await database.query(query, [id_meta, id_usuario]);
                return (resultado.rowCount ?? 0) > 0;
            } catch (error) {
                logger.error({ error, id_usuario, id_meta }, '[CaixaPessoal] Erro ao remover meta');
                throw error;
            }
        }
}
