// model/Parcela.ts
import databaseInstance from './DatabaseModel.js';
import type ParcelaDTO from '../interface/ParcelaDTO.js';
import type EmprestimoDTO from '../interface/EmprestimoDTO.js';
import type pg from 'pg';

const database = databaseInstance.pool;
type Executor = pg.Pool | pg.PoolClient;

export default class Parcela {
  // --------------------------------------
  // MAPEIA UMA LINHA DO BANCO PARA O DTO DA API
  // --------------------------------------
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

  // --------------------------------------
  // GERA AS PARCELAS DE UM EMPRÉSTIMO
  // Deve rodar na MESMA transação do cadastro do empréstimo
  // (por isso aceita um executor opcional: client de transação ou o pool padrão)
  // --------------------------------------
  static async gerarParcelas(
    emprestimo: EmprestimoDTO & { id_emprestimo: number },
    executor: Executor = database,
  ): Promise<boolean> {
    try {
      const dataBase = new Date(emprestimo.data_emprestimo);

      for (let numero = 1; numero <= emprestimo.num_parcelas; numero++) {
        const vencimento = new Date(dataBase);
        vencimento.setMonth(vencimento.getMonth() + numero);

        const query = `
          INSERT INTO Parcela (id_emprestimo, numero_parcela, valor_esperado, data_vencimento, status_parcela)
          VALUES ($1, $2, $3, $4, 'pendente')
        `;

        await executor.query(query, [
          emprestimo.id_emprestimo,
          numero,
          emprestimo.valor_parcela,
          vencimento,
        ]);
      }

      return true;
    } catch (error) {
      console.error('[ParcelaModel] Erro ao gerar parcelas:', error);
      throw error;
    }
  }

  // --------------------------------------
  // LISTAR PARCELAS DE UM EMPRÉSTIMO
  // --------------------------------------
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

  // --------------------------------------
  // BUSCAR PARCELA POR ID
  // --------------------------------------
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

  // --------------------------------------
  // DAR BAIXA (marcar como paga)
  // --------------------------------------
  static async marcarComoPaga(id_parcela: number, data_pagamento?: Date): Promise<boolean> {
    try {
      const query = `
        UPDATE Parcela
        SET status_parcela = 'pago',
            data_pagamento = $2,
            valor_pago = valor_esperado
        WHERE id_parcela = $1
      `;
      const res = await database.query(query, [id_parcela, data_pagamento ?? new Date()]);
      return (res.rowCount ?? 0) > 0;
    } catch (error) {
      console.error(`[ParcelaModel] Erro ao dar baixa na parcela (id: ${id_parcela}):`, error);
      throw error;
    }
  }

  // --------------------------------------
  // DESFAZER PAGAMENTO
  // --------------------------------------
  static async desfazerPagamento(id_parcela: number): Promise<boolean> {
    try {
      const query = `
        UPDATE Parcela
        SET status_parcela = 'pendente',
            data_pagamento = NULL,
            valor_pago = 0.00
        WHERE id_parcela = $1
      `;
      const res = await database.query(query, [id_parcela]);
      return (res.rowCount ?? 0) > 0;
    } catch (error) {
      console.error(`[ParcelaModel] Erro ao desfazer pagamento da parcela (id: ${id_parcela}):`, error);
      throw error;
    }
  }
}