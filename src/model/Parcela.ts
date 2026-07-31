import databaseInstance from './DatabaseModel.js';
import type ParcelaDTO from '../interface/ParcelaDTO.js';
import type EmprestimoDTO from '../interface/EmprestimoDTO.js';
import type pg from 'pg';
import CalculadoraFinanceira from '../services/CalculadoraFinanceira.js';
import { adicionarMeses, isDataValida } from '../services/Utilitario.js';

const database = databaseInstance.pool;
type Executor = pg.Pool | pg.PoolClient;

export default class Parcela {
  private static toDTO(row: any): ParcelaDTO {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const vencimento = new Date(row.data_vencimento);

    let status: ParcelaDTO['status_parcela'];
    if (row.data_pagamento) {
      status = 'PAGA';
    } else if (vencimento < hoje) {
      status = 'ATRASADA';
    } else {
      status = 'PENDENTE';
    }

    return {
      id_parcela: row.id_parcela,
      id_emprestimo: row.id_emprestimo,
      numero_parcela: row.numero_parcela,
      valor_parcela: Number(row.valor_esperado),
      data_vencimento: row.data_vencimento,
      data_pagamento: row.data_pagamento ?? null,
      status_parcela: status,
    };
  }

  static async gerarParcelas(
    emprestimo: EmprestimoDTO & { id_emprestimo: number },
    executor: Executor = database,
  ): Promise<boolean> {
    return Parcela.gerarParcelasRestantes(emprestimo, 1, executor);
  }

  static async gerarParcelasRestantes(
    emprestimo: EmprestimoDTO & { id_emprestimo: number },
    aPartirDe: number,
    executor: Executor = database,
  ): Promise<boolean> {
    try {
      const {
        id_emprestimo,
        num_parcelas,
        valor_emprestimo,
        valor_parcela: valorParcelaInformado,
        juros,
        tipo_juros,
        data_emprestimo
      } = emprestimo;

      // Validar data do emprestimo
      if (!isDataValida(data_emprestimo)) {
        throw new Error('Data do emprestimo invalida.');
      }

      // Calcular montante (valor total com juros)
      let montante = valor_emprestimo;
      if (tipo_juros === 'simples') {
        montante = valor_emprestimo * (1 + (juros / 100) * num_parcelas);
      } else {
        montante = valor_emprestimo * Math.pow(1 + juros / 100, num_parcelas);
      }

      // DETERMINAR VALOR DA PARCELA
      let valorParcelaBase: number;

      if (valorParcelaInformado && valorParcelaInformado > 0) {
        // Usuario informou manualmente - validar contra o MONTANTE (com juros)
        const validacao = CalculadoraFinanceira.validarSomaParcelas(
          montante, // <-- CORRIGIDO: usa montante em vez de valor_emprestimo
          valorParcelaInformado,
          num_parcelas,
          0.01 // margem de 1 centavo
        );

        if (!validacao.valido) {
          throw new Error(
            `Soma das parcelas (${(valorParcelaInformado * num_parcelas).toFixed(2)}) ` +
            `não confere com o valor total com juros (${montante.toFixed(2)}). ` +
            `Sugestão: R$ ${validacao.sugestao?.toFixed(2)} por parcela.`
          );
        }

        valorParcelaBase = valorParcelaInformado;
      } else {
        // Calcular automaticamente
        valorParcelaBase = CalculadoraFinanceira.calcularValorParcela(
          montante, // <-- CORRIGIDO: usa montante em vez de valor_emprestimo
          num_parcelas,
          juros,
          tipo_juros as 'simples' | 'compostos'
        );
        // Arredondar para 2 casas
        valorParcelaBase = Math.round(valorParcelaBase * 100) / 100;
      }

      // Calcular ajuste da ultima parcela
      const ultimaParcela = CalculadoraFinanceira.ajustarUltimaParcela(
        montante, // <-- CORRIGIDO: usa montante em vez de valor_emprestimo
        valorParcelaBase,
        num_parcelas,
        juros,
        tipo_juros as 'simples' | 'compostos'
      );

      // GERAR PARCELAS
      const dataBase = new Date(data_emprestimo);

      for (let numero = aPartirDe; numero <= num_parcelas; numero++) {
        const vencimento = adicionarMeses(dataBase, numero);
        const valor = (numero === num_parcelas) ? ultimaParcela : valorParcelaBase;

        await executor.query(
          `INSERT INTO Parcela (id_emprestimo, numero_parcela, valor_esperado, data_vencimento, status_parcela)
           VALUES ($1, $2, $3, $4, 'pendente')`,
          [id_emprestimo, numero, valor, vencimento]
        );
      }

      return true;
    } catch (error) {
      console.error('[ParcelaModel] Erro ao gerar parcelas:', error);
      throw error;
    }
  }

  static async contarPagas(id_emprestimo: number, executor: Executor = database): Promise<number> {
    const res = await executor.query(
      `SELECT COUNT(*)::int AS total FROM Parcela WHERE id_emprestimo = $1 AND status_parcela = 'pago'`,
      [id_emprestimo],
    );
    return res.rows[0]?.total ?? 0;
  }

  static async excluirParcelasPendentes(id_emprestimo: number, executor: Executor = database): Promise<void> {
    await executor.query(
      `DELETE FROM Parcela WHERE id_emprestimo = $1 AND status_parcela = 'pendente'`,
      [id_emprestimo],
    );
  }

  static async excluirPendentesPorCliente(id_cliente: number, executor: Executor = database): Promise<void> {
    await executor.query(
      `
        DELETE FROM Parcela p
        USING Emprestimo e
        WHERE p.id_emprestimo = e.id_emprestimo
          AND e.id_cliente = $1
          AND p.status_parcela = 'pendente'
      `,
      [id_cliente],
    );
  }

  static async listarPorEmprestimo(id_emprestimo: number): Promise<ParcelaDTO[]> {
    try {
      const query = `
        SELECT * FROM Parcela
        WHERE id_emprestimo = $1
        ORDER BY numero_parcela ASC
      `;
      const res = await database.query(query, [id_emprestimo]);
      return res.rows.map((r: any) => Parcela.toDTO(r));
    } catch (error) {
      console.error(`[ParcelaModel] Erro ao listar parcelas do emprestimo ${id_emprestimo}:`, error);
      throw error;
    }
  }

  static async listarPorCliente(id_cliente: number): Promise<ParcelaDTO[]> {
    try {
      const query = `
        SELECT p.*
        FROM Parcela p
        JOIN Emprestimo e ON p.id_emprestimo = e.id_emprestimo
        WHERE e.id_cliente = $1
        ORDER BY e.id_emprestimo, p.numero_parcela ASC
      `;
      const res = await database.query(query, [id_cliente]);
      return res.rows.map((r: any) => Parcela.toDTO(r));
    } catch (error) {
      console.error(`[ParcelaModel] Erro ao listar parcelas do cliente ${id_cliente}:`, error);
      throw error;
    }
  }

  static async buscarPorId(id_parcela: number): Promise<ParcelaDTO> {
    try {
      const query = `SELECT * FROM Parcela WHERE id_parcela = $1`;
      const res = await database.query(query, [id_parcela]);

      if (res.rows.length === 0) {
        throw new Error(`Parcela com ID ${id_parcela} não encontrada.`);
      }

      return Parcela.toDTO(res.rows[0]);
    } catch (error) {
      console.error(`[ParcelaModel] Erro ao buscar parcela (id: ${id_parcela}):`, error);
      throw error;
    }
  }

  static async marcarComoPaga(id_parcela: number, data_pagamento?: Date): Promise<boolean> {
    const client = await database.connect();

    try {
      await client.query('BEGIN');

      const atualizarParcela = `
        UPDATE Parcela
        SET status_parcela = 'pago',
            data_pagamento = $2,
            valor_pago = valor_esperado
        WHERE id_parcela = $1
        RETURNING id_emprestimo
      `;

      const updateRes = await client.query(atualizarParcela, [
        id_parcela,
        data_pagamento ?? new Date(),
      ]);

      if ((updateRes.rowCount ?? 0) === 0) {
        await client.query('ROLLBACK');
        return false;
      }

      const id_emprestimo = updateRes.rows[0].id_emprestimo;

      const parcelasNaoPagas = await client.query(
        `SELECT COUNT(*)::int AS total
         FROM Parcela
         WHERE id_emprestimo = $1 AND status_parcela != 'pago'`,
        [id_emprestimo]
      );

      if ((parcelasNaoPagas.rows[0]?.total ?? 0) === 0) {
        await client.query(
          `UPDATE Emprestimo SET status_emprestimo = FALSE WHERE id_emprestimo = $1`,
          [id_emprestimo]
        );
      }

      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`[ParcelaModel] Erro ao dar baixa na parcela (id: ${id_parcela}):`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async desfazerPagamento(id_parcela: number): Promise<boolean> {
    const client = await database.connect();

    try {
      await client.query('BEGIN');

      const query = `
        UPDATE Parcela
        SET status_parcela = 'pendente',
            data_pagamento = NULL,
            valor_pago = 0.00
        WHERE id_parcela = $1
        RETURNING id_emprestimo
      `;

      const res = await client.query(query, [id_parcela]);
      if ((res.rowCount ?? 0) === 0) {
        await client.query('ROLLBACK');
        return false;
      }

      const id_emprestimo = res.rows[0].id_emprestimo;
      await client.query(
        `UPDATE Emprestimo SET status_emprestimo = TRUE WHERE id_emprestimo = $1`,
        [id_emprestimo]
      );

      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`[ParcelaModel] Erro ao desfazer pagamento da parcela (id: ${id_parcela}):`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  static toPublicDTO(row: any): ParcelaDTO {
    return Parcela.toDTO(row);
  }
}