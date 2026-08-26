import type ParcelaDTO from '../interface/ParcelaDTO.js';
import type EmprestimoDTO from '../interface/EmprestimoDTO.js';
import type pg from 'pg';
import CalculadoraFinanceira from '../services/CalculadoraFinanceira.js';
import { adicionarMeses, isDataValida } from '../services/Utilitario.js';
import CaixaPessoal from './CaixaPessoal.js';
import { DatabaseModel } from "./DatabaseModel.js";

const database = new DatabaseModel().pool;type Executor = pg.Pool | pg.PoolClient;

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

      if (!isDataValida(data_emprestimo)) {
        throw new Error('Data do emprestimo invalida.');
      }

      let montante = valor_emprestimo;
      if (tipo_juros === 'simples') {
        montante = valor_emprestimo * (1 + (juros / 100) * num_parcelas);
      } else {
        montante = valor_emprestimo * Math.pow(1 + juros / 100, num_parcelas);
      }

      let valorParcelaBase: number;

      if (valorParcelaInformado && valorParcelaInformado > 0) {
        const validacao = CalculadoraFinanceira.validarSomaParcelas(
          montante,
          valorParcelaInformado,
          num_parcelas,
          0.01
        );

        if (!validacao.valido) {
          throw new Error(
            `Soma das parcelas (${(valorParcelaInformado * num_parcelas).toFixed(2)}) ` +
            `nao confere com o valor total com juros (${montante.toFixed(2)}). ` +
            `Sugestao: R$ ${validacao.sugestao?.toFixed(2)} por parcela.`
          );
        }

        valorParcelaBase = valorParcelaInformado;
      } else {
        valorParcelaBase = CalculadoraFinanceira.calcularValorParcela(
          montante,
          num_parcelas,
          juros,
          tipo_juros as 'simples' | 'compostos'
        );
        valorParcelaBase = Math.round(valorParcelaBase * 100) / 100;
      }

      const ultimaParcela = CalculadoraFinanceira.ajustarUltimaParcela(
        montante,
        valorParcelaBase,
        num_parcelas,
        juros,
        tipo_juros as 'simples' | 'compostos'
      );

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
      `SELECT COUNT(*)::int AS total FROM Parcela WHERE id_emprestimo = $1 AND status_parcela = 'PAGA'`,
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

  static async listarPorCliente(id_cliente: number, id_usuario?: number): Promise<ParcelaDTO[]> {
    try {
      let query = `
        SELECT p.*
        FROM Parcela p
        JOIN Emprestimo e ON p.id_emprestimo = e.id_emprestimo
        WHERE e.id_cliente = $1
      `;
      const params: any[] = [id_cliente];
      
      if (id_usuario !== undefined) {
        query += ` AND e.id_usuario = $2`;
        params.push(id_usuario);
      }
      
      query += ` ORDER BY e.id_emprestimo, p.numero_parcela ASC`;
      
      const res = await database.query(query, params);
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
        throw new Error(`Parcela com ID ${id_parcela} nao encontrada.`);
      }

      return Parcela.toDTO(res.rows[0]);
    } catch (error) {
      console.error(`[ParcelaModel] Erro ao buscar parcela (id: ${id_parcela}):`, error);
      throw error;
    }
  }

 static async marcarComoPaga(id_parcela: number, data_pagamento?: Date, id_usuario: number = 1): Promise<boolean> {
  console.log('[DEBUG] marcarComoPaga - id_parcela:', id_parcela, 'id_usuario:', id_usuario);
  const client = await database.connect();

  try {
    await client.query('BEGIN');

    const infoRes = await client.query(
      `SELECT p.numero_parcela, p.valor_esperado, e.id_emprestimo, e.num_parcelas, c.nome, c.sobrenome
       FROM Parcela p
       JOIN Emprestimo e ON p.id_emprestimo = e.id_emprestimo
       JOIN Cliente c ON e.id_cliente = c.id_cliente
       WHERE p.id_parcela = $1`,
      [id_parcela]
    );
    console.log('[DEBUG] marcarComoPaga - infoRes:', infoRes.rows);

    const dtPagto = data_pagamento ?? new Date();

    const atualizarParcela = `
      UPDATE Parcela
      SET status_parcela = 'pago',
          data_pagamento = $2,
          valor_pago = valor_esperado
      WHERE id_parcela = $1
      RETURNING id_emprestimo
    `;

    const updateRes = await client.query(atualizarParcela, [id_parcela, dtPagto]);
    console.log('[DEBUG] marcarComoPaga - updateRes:', updateRes);

    if ((updateRes.rowCount ?? 0) === 0) {
      console.log('[DEBUG] marcarComoPaga - nenhuma linha atualizada');
      await client.query('ROLLBACK');
      return false;
    }

    const id_emprestimo = updateRes.rows[0].id_emprestimo;

    if (infoRes.rows.length > 0) {
      const info = infoRes.rows[0];
      const nomeCliente = `${info.nome} ${info.sobrenome}`;
      const desc = `Recebimento da Parcela ${info.numero_parcela}/${info.num_parcelas} do Emprestimo #${id_emprestimo} - ${nomeCliente}`;

      console.log('[DEBUG] marcarComoPaga - inserindo movimentacao:', { id_usuario, valor: Number(info.valor_esperado), desc });
      
      await client.query(
        `INSERT INTO caixa_pessoal_movimentacao (id_usuario, tipo, valor, categoria, descricao, data)
         VALUES ($1, 'entrada', $2, 'Emprestimo - Recebimento', $3, $4)`,
        [id_usuario, Number(info.valor_esperado), desc, dtPagto]
      );
    }

    const parcelasNaoPagas = await client.query(
      `SELECT COUNT(*)::int AS total
       FROM Parcela
       WHERE id_emprestimo = $1 AND (LOWER(status_parcela) NOT IN ('pago', 'paga') AND data_pagamento IS NULL)`,
      [id_emprestimo]
    );
    console.log('[DEBUG] marcarComoPaga - parcelasNaoPagas:', parcelasNaoPagas.rows[0]?.total);

    if ((parcelasNaoPagas.rows[0]?.total ?? 0) === 0) {
      console.log('[DEBUG] marcarComoPaga - todas as parcelas pagas, atualizando status do emprestimo');
      await client.query(
        `UPDATE Emprestimo SET status_emprestimo = FALSE WHERE id_emprestimo = $1`,
        [id_emprestimo]
      );
    }

    await client.query('COMMIT');
    console.log('[DEBUG] marcarComoPaga - sucesso!');
    void CaixaPessoal.recalcularESalvarSaldo(id_usuario);
    return true;
  } catch (error) {
    console.error('[DEBUG] marcarComoPaga - erro:', error);
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

  static async desfazerPagamento(id_parcela: number, id_usuario: number = 1): Promise<boolean> {
    const client = await database.connect();

    try {
      await client.query('BEGIN');

      const infoRes = await client.query(
        `SELECT p.numero_parcela, p.valor_esperado, e.id_emprestimo, c.nome, c.sobrenome
         FROM Parcela p
         JOIN Emprestimo e ON p.id_emprestimo = e.id_emprestimo
         JOIN Cliente c ON e.id_cliente = c.id_cliente
         WHERE p.id_parcela = $1`,
        [id_parcela]
      );

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

      if (infoRes.rows.length > 0) {
        const info = infoRes.rows[0];
        const nomeCliente = `${info.nome} ${info.sobrenome}`;
        const desc = `Estorno da Parcela ${info.numero_parcela} do Emprestimo #${id_emprestimo} - ${nomeCliente}`;

        await client.query(
          `INSERT INTO caixa_pessoal_movimentacao (id_usuario, tipo, valor, categoria, descricao, data)
           VALUES ($1, 'saida', $2, 'Estorno de Recebimento', $3, CURRENT_DATE)`,
          [id_usuario, Number(info.valor_esperado), desc]
        );
      }

      await client.query('COMMIT');
      void CaixaPessoal.recalcularESalvarSaldo(id_usuario);
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`[ParcelaModel] Erro ao desfazer pagamento da parcela (id: ${id_parcela}):`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async listarParcelasVencendoNoMes(
    id_usuario: number,
    mes?: number,
    ano?: number
  ): Promise<ParcelaDTO[]> {
    try {
      const agora = new Date();
      const anoRef = ano || agora.getFullYear();
      const mesRef = mes !== undefined ? mes : agora.getMonth() + 1;

      const dataInicio = `${anoRef}-${String(mesRef).padStart(2, '0')}-01`;
      const ultimoDia = new Date(anoRef, mesRef, 0).getDate();
      const dataFim = `${anoRef}-${String(mesRef).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;

      const query = `
        SELECT p.*, e.id_usuario
        FROM Parcela p
        JOIN Emprestimo e ON p.id_emprestimo = e.id_emprestimo
        WHERE e.id_usuario = $1
          AND e.status_emprestimo = TRUE
          AND (LOWER(p.status_parcela) IN ('pendente', 'atrasada', 'atrasado') OR p.data_pagamento IS NULL)
          AND p.data_vencimento BETWEEN $2 AND $3
        ORDER BY p.data_vencimento ASC
      `;

      const res = await database.query(query, [id_usuario, dataInicio, dataFim]);
      return res.rows.map((r: any) => Parcela.toDTO(r));
    } catch (error) {
      console.error('[ParcelaModel] Erro ao listar parcelas vencendo no mes:', error);
      throw error;
    }
  }

  static toPublicDTO(row: any): ParcelaDTO {
    return Parcela.toDTO(row);
  }
}