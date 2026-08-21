import type EmprestimoDTO from '../interface/EmprestimoDTO.js';
import databaseInstance from './DatabaseModel.js';
import Parcela from './Parcela.js';
import Juros from '../services/Juros.js';
import { isDataValida, formatarDataISO } from '../services/Utilitario.js';
import CaixaPessoal from './CaixaPessoal.js';

const database = databaseInstance.pool;

export default class Emprestimo {
  private id_emprestimo: number = 0;
  private id_cliente: number;
  private valor_emprestimo: number;
  private num_parcelas: number;
  private valor_parcela: number;
  private tipo_juros: string;
  private juros: number;
  private data_emprestimo: Date;
  private data_devolucao: Date | undefined;
  private status_emprestimo: boolean | undefined;
  private forma_pagamento: string | undefined;

  constructor(
    _id_cliente: number,
    _valor_emprestimo: number,
    _num_parcelas: number,
    _valor_parcela: number,
    _tipo_juros: string,
    _juros: number,
    _data_emprestimo: Date,
    _data_devolucao?: Date,
    _status_emprestimo?: boolean,
    _forma_pagamento?: string,
  ) {
    this.id_cliente = _id_cliente;
    this.valor_emprestimo = _valor_emprestimo;
    this.num_parcelas = _num_parcelas;
    this.valor_parcela = _valor_parcela;
    this.tipo_juros = _tipo_juros;
    this.juros = _juros;
    this.data_emprestimo = _data_emprestimo;
    this.data_devolucao = _data_devolucao;
    this.status_emprestimo = _status_emprestimo;
    this.forma_pagamento = _forma_pagamento;
  }

  public getIdEmprestimo(): number { return this.id_emprestimo; }
  public setIdEmprestimo(id: number): void { this.id_emprestimo = id; }
  public getIdCliente(): number { return this.id_cliente; }
  public setIdCliente(id: number): void { this.id_cliente = id; }
  public getValorEmprestimo(): number { return this.valor_emprestimo; }
  public setValorEmprestimo(v: number): void { this.valor_emprestimo = v; }
  public getNumParcelas(): number { return this.num_parcelas; }
  public setNumParcelas(n: number): void { this.num_parcelas = n; }
  public getValorParcela(): number { return this.valor_parcela; }
  public setValorParcela(v: number): void { this.valor_parcela = v; }
  public getTipoJuros(): string { return this.tipo_juros; }
  public setTipoJuros(t: string): void { this.tipo_juros = t; }
  public getJuros(): number { return this.juros; }
  public setJuros(j: number): void { this.juros = j; }
  public getDataEmprestimo(): Date { return this.data_emprestimo; }
  public setDataEmprestimo(d: Date): void { this.data_emprestimo = d; }
  public getDataDevolucao(): Date | undefined { return this.data_devolucao; }
  public setDataDevolucao(d: Date): void { this.data_devolucao = d; }
  public getStatusEmprestimo(): boolean | undefined { return this.status_emprestimo; }
  public setStatusEmprestimo(s: boolean): void { this.status_emprestimo = s; }
  public getFormaPagamento(): string | undefined { return this.forma_pagamento; }
  public setFormaPagamento(f: string): void { this.forma_pagamento = f; }

  private static toDTO(row: any): EmprestimoDTO {
    return {
      id_emprestimo: row.id_emprestimo,
      id_usuario: row.id_usuario ? Number(row.id_usuario) : undefined,
      id_cliente: row.id_cliente,
      nome_cliente: row.nome_cliente,
      sobrenome_cliente: row.sobrenome_cliente,
      valor_emprestimo: Number(row.valor_emprestimo),
      num_parcelas: row.num_parcelas,
      valor_parcela: Number(row.valor_parcela),
      tipo_juros: row.tipo_juros,
      juros: Number(row.juros),
      data_emprestimo: row.data_emprestimo,
      data_devolucao: row.data_devolucao,
      status_emprestimo: row.status_emprestimo,
      forma_pagamento: row.forma_pagamento ?? undefined,
    };
  }

  private static toParcelaInput(emprestimo: Emprestimo, id_emprestimo: number): EmprestimoDTO & { id_emprestimo: number } {
    const input: EmprestimoDTO & { id_emprestimo: number } = {
      id_emprestimo,
      id_cliente: emprestimo.getIdCliente(),
      valor_emprestimo: emprestimo.getValorEmprestimo(),
      num_parcelas: emprestimo.getNumParcelas(),
      valor_parcela: emprestimo.getValorParcela(),
      tipo_juros: emprestimo.getTipoJuros(),
      juros: emprestimo.getJuros(),
      data_emprestimo: emprestimo.getDataEmprestimo(),
      status_emprestimo: emprestimo.getStatusEmprestimo() ?? true,
    };

    const dataDevolucao = emprestimo.getDataDevolucao();
    if (dataDevolucao) {
      input.data_devolucao = dataDevolucao;
    }

    const formaPagamento = emprestimo.getFormaPagamento();
    if (formaPagamento) {
      input.forma_pagamento = formaPagamento;
    }

    return input;
  }

  static async listarEmprestimos(
    status: 'ativo' | 'quitado' | 'todos' = 'ativo',
    id_cliente?: number,
    id_usuario?: number  
  ): Promise<EmprestimoDTO[]> {
    try {
      const condicoes: string[] = [];
      const params: (number | string)[] = [];
      let paramIndex = 1;
  
      if (id_usuario !== undefined) {
        condicoes.push(`e.id_usuario = $${paramIndex}`);
        params.push(id_usuario);
        paramIndex++;
      }
  
      if (status === 'ativo') {
        condicoes.push('e.status_emprestimo = TRUE');
      } else if (status === 'quitado') {
        condicoes.push('e.status_emprestimo = FALSE');
      }
  
      if (id_cliente !== undefined) {
        condicoes.push(`e.id_cliente = $${paramIndex}`);
        params.push(id_cliente);
        paramIndex++;
      }
  
      const where = condicoes.length > 0 ? `WHERE ${condicoes.join(' AND ')}` : '';
  
      const query = `
        SELECT e.*, c.nome AS nome_cliente, c.sobrenome AS sobrenome_cliente
        FROM Emprestimo e
        JOIN Cliente c ON e.id_cliente = c.id_cliente
        ${where}
        ORDER BY e.id_emprestimo DESC
      `;
  
      const res = await database.query(query, params);
      return res.rows.map((r: any) => Emprestimo.toDTO(r));
    } catch (error) {
      console.error('[EmprestimoModel] Erro ao listar emprestimos:', error);
      throw error;
    }
  }

  static async validarClientePertenceAoCredor(id_cliente: number, id_usuario: number): Promise<boolean> {
    try {
      const query = `
        SELECT id_cliente FROM Cliente
        WHERE id_cliente = $1 AND id_usuario = $2 AND status_cliente = TRUE
      `;
      const res = await database.query(query, [id_cliente, id_usuario]);
      return res.rows.length > 0;
    } catch (error) {
      console.error('[EmprestimoModel] Erro ao validar cliente:', error);
      return false;
    }
  }

  static async listarEmprestimo(id_emprestimo: number, id_usuario?: number): Promise<EmprestimoDTO> {
    try {
      let query = `
        SELECT e.*, c.nome AS nome_cliente, c.sobrenome AS sobrenome_cliente
        FROM Emprestimo e
        JOIN Cliente c ON e.id_cliente = c.id_cliente
        WHERE e.id_emprestimo = $1
      `;
      const params: any[] = [id_emprestimo];
      
      if (id_usuario !== undefined) {
        query += ` AND e.id_usuario = $2`;
        params.push(id_usuario);
      }

      const res = await database.query(query, params);

      if (res.rows.length === 0) {
        throw new Error(`Emprestimo com ID ${id_emprestimo} nao encontrado.`);
      }

      return Emprestimo.toDTO(res.rows[0]);
    } catch (error) {
      console.error(`[EmprestimoModel] Erro ao buscar emprestimo (id: ${id_emprestimo}):`, error);
      throw error;
    }
  }

  static async cadastrarEmprestimo(emprestimo: Emprestimo, id_usuario: number = 1): Promise<number> {
  const client = await database.connect();

  try {
    if (!isDataValida(emprestimo.getDataEmprestimo())) {
      throw new Error('Data do emprestimo invalida.');
    }

    await client.query('BEGIN');

    let valorParcelaCalculado = emprestimo.getValorParcela();

    if (valorParcelaCalculado === 0) {
      const valorTotal = emprestimo.getValorEmprestimo();
      const numParcelas = emprestimo.getNumParcelas();
      const juros = emprestimo.getJuros();
      const tipoJuros = emprestimo.getTipoJuros() as 'simples' | 'compostos';

      const resultado = Juros.calcularParcelas(valorTotal, juros, numParcelas, tipoJuros);
      
      emprestimo.setValorParcela(resultado.valorParcelaBase);
    }

    const query = `
      INSERT INTO Emprestimo (
        id_usuario, id_cliente, valor_emprestimo, num_parcelas, valor_parcela, 
        tipo_juros, juros, data_emprestimo, data_devolucao, status_emprestimo, forma_pagamento
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id_emprestimo;
    `;

    const valores = [
      id_usuario,  
      emprestimo.getIdCliente(),
      emprestimo.getValorEmprestimo(),
      emprestimo.getNumParcelas(),
      emprestimo.getValorParcela(),
      emprestimo.getTipoJuros(),
      emprestimo.getJuros(),
      emprestimo.getDataEmprestimo(),
      emprestimo.getDataDevolucao(),
      emprestimo.getStatusEmprestimo() ?? true,
      emprestimo.getFormaPagamento() ?? null,
    ];

    console.log('[DEBUG] INSERT Emprestimo - valores:', valores);

    const result = await client.query(query, valores);
    if (result.rows.length === 0) {
      throw new Error('INSERT nao retornou ID.');
    }

    const id_emprestimo = result.rows[0].id_emprestimo as number;

    const input = Emprestimo.toParcelaInput(emprestimo, id_emprestimo);
    await Parcela.gerarParcelas(input, client);

    const cliRes = await client.query(
      `SELECT nome, sobrenome FROM Cliente WHERE id_cliente = $1`,
      [emprestimo.getIdCliente()]
    );
    const nomeCli = cliRes.rows[0] ? `${cliRes.rows[0].nome} ${cliRes.rows[0].sobrenome}` : `Cliente #${emprestimo.getIdCliente()}`;

    await client.query(
      `INSERT INTO caixa_pessoal_movimentacao (id_usuario, tipo, valor, categoria, descricao, data)
       VALUES ($1, 'saida', $2, 'Emprestimo Concedido', $3, $4)`,
      [
        id_usuario,
        emprestimo.getValorEmprestimo(),
        `Emprestimo concedido a ${nomeCli} (#${id_emprestimo})`,
        emprestimo.getDataEmprestimo(),
      ]
    );

    await client.query('COMMIT');
    console.info(`[EmprestimoModel] Emprestimo cadastrado com parcelas e movimentacao de caixa. ID: ${id_emprestimo}`);
    void CaixaPessoal.recalcularESalvarSaldo(id_usuario);
    return id_emprestimo;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[EmprestimoModel] Erro ao cadastrar emprestimo:', error);
    throw error;
  } finally {
    client.release();
  }
}

  static async removerEmprestimo(id_emprestimo: number, id_usuario?: number): Promise<boolean> {
    const client = await database.connect();

    try {
      if (id_usuario !== undefined) {
        const checkQuery = `
          SELECT id_emprestimo FROM Emprestimo
          WHERE id_emprestimo = $1 AND id_usuario = $2
        `;
        const checkRes = await client.query(checkQuery, [id_emprestimo, id_usuario]);
        if (checkRes.rows.length === 0) {
          return false;
        }
      }

      const empRes = await client.query(
        `SELECT status_emprestimo FROM Emprestimo WHERE id_emprestimo = $1`,
        [id_emprestimo]
      );

      if (empRes.rows.length === 0) {
        return false;
      }

      const isQuitado = empRes.rows[0].status_emprestimo === false;

      if (isQuitado) {
        await client.query('BEGIN');
        await client.query(`DELETE FROM Parcela WHERE id_emprestimo = $1`, [id_emprestimo]);
        const res = await client.query(
          `DELETE FROM Emprestimo WHERE id_emprestimo = $1`,
          [id_emprestimo]
        );
        await client.query('COMMIT');
        return (res.rowCount ?? 0) > 0;
      }

      const pagas = await Parcela.contarPagas(id_emprestimo, client);
      if (pagas > 0) {
        throw new Error(
          `Nao e possivel excluir um emprestimo com ${pagas} parcela(s) ja paga(s). ` +
          `Para remover, primeiro desfaca os pagamentos ou liquide o contrato.`
        );
      }

      await client.query('BEGIN');
      await Parcela.excluirParcelasPendentes(id_emprestimo, client);
      const res = await client.query(
        `DELETE FROM Emprestimo WHERE id_emprestimo = $1`,
        [id_emprestimo],
      );
      await client.query('COMMIT');
      return (res.rowCount ?? 0) > 0;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`[EmprestimoModel] Erro ao remover emprestimo (id: ${id_emprestimo}):`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async atualizarEmprestimo(emprestimo: Emprestimo, id_usuario?: number): Promise<boolean> {
    const client = await database.connect();

    try {
      if (id_usuario !== undefined) {
        const checkQuery = `
          SELECT id_emprestimo FROM Emprestimo
          WHERE id_emprestimo = $1 AND id_usuario = $2
        `;
        const checkRes = await client.query(checkQuery, [emprestimo.getIdEmprestimo(), id_usuario]);
        if (checkRes.rows.length === 0) {
          return false;
        }
      }

      const atual = await Emprestimo.listarEmprestimo(emprestimo.getIdEmprestimo());
      if (!atual) return false;

      if (!isDataValida(emprestimo.getDataEmprestimo())) {
        throw new Error('Data do emprestimo invalida.');
      }

      const parcelasAlteradas =
        atual.num_parcelas !== emprestimo.getNumParcelas() ||
        atual.valor_parcela !== emprestimo.getValorParcela() ||
        new Date(atual.data_emprestimo).getTime() !== emprestimo.getDataEmprestimo().getTime();

      await client.query('BEGIN');

      if (parcelasAlteradas) {
        const pagas = await Parcela.contarPagas(emprestimo.getIdEmprestimo(), client);

        if (emprestimo.getNumParcelas() < pagas) {
          throw new Error(
            `Nao e possivel reduzir para ${emprestimo.getNumParcelas()} parcelas: ${pagas} ja foram pagas.`,
          );
        }

        await Parcela.excluirParcelasPendentes(emprestimo.getIdEmprestimo(), client);
        await Parcela.gerarParcelasRestantes(
          Emprestimo.toParcelaInput(emprestimo, emprestimo.getIdEmprestimo()),
          pagas + 1,
          client,
        );

        const parcelas = await Parcela.listarPorEmprestimo(emprestimo.getIdEmprestimo());
        if (parcelas && parcelas.length > 0) {
          const primeiraParcela = parcelas[0];
          if (primeiraParcela && primeiraParcela.valor_parcela !== undefined) {
            await client.query(
              `UPDATE Emprestimo SET valor_parcela = $1 WHERE id_emprestimo = $2`,
              [primeiraParcela.valor_parcela, emprestimo.getIdEmprestimo()]
            );
          }
        }
      }

      // Se o status mudou para quitado (status_emprestimo === false), quitar parcelas pendentes e registrar entradas
      if (atual.status_emprestimo === true && (emprestimo.getStatusEmprestimo() === false)) {
        const pendentesRes = await client.query(
          `SELECT p.id_parcela, p.numero_parcela, p.valor_esperado, c.nome, c.sobrenome
           FROM Parcela p
           JOIN Emprestimo e ON p.id_emprestimo = e.id_emprestimo
           JOIN Cliente c ON e.id_cliente = c.id_cliente
           WHERE p.id_emprestimo = $1 AND (LOWER(p.status_parcela) != 'pago' AND LOWER(p.status_parcela) != 'paga' AND p.data_pagamento IS NULL)`,
          [emprestimo.getIdEmprestimo()]
        );

        const idOwner = id_usuario ?? atual.id_usuario;

        for (const p of pendentesRes.rows) {
          await client.query(
            `UPDATE Parcela
             SET status_parcela = 'pago', data_pagamento = CURRENT_DATE, valor_pago = valor_esperado
             WHERE id_parcela = $1`,
            [p.id_parcela]
          );

          const desc = `Recebimento da Parcela ${p.numero_parcela}/${emprestimo.getNumParcelas()} do Emprestimo #${emprestimo.getIdEmprestimo()} - ${p.nome} ${p.sobrenome}`;

          await client.query(
            `INSERT INTO caixa_pessoal_movimentacao (id_usuario, tipo, valor, categoria, descricao, data)
             VALUES ($1, 'entrada', $2, 'Emprestimo - Quitação', $3, CURRENT_DATE)`,
            [idOwner, Number(p.valor_esperado), desc]
          );
        }
      }

      const query = `
        UPDATE Emprestimo SET
          id_cliente = $1,
          valor_emprestimo = $2,
          num_parcelas = $3,
          valor_parcela = $4,
          tipo_juros = $5,
          juros = $6,
          data_emprestimo = $7,
          data_devolucao = $8,
          status_emprestimo = $9,
          forma_pagamento = $10
        WHERE id_emprestimo = $11
      `;

      const valores = [
        emprestimo.getIdCliente(),
        emprestimo.getValorEmprestimo(),
        emprestimo.getNumParcelas(),
        emprestimo.getValorParcela(),
        emprestimo.getTipoJuros(),
        emprestimo.getJuros(),
        emprestimo.getDataEmprestimo(),
        emprestimo.getDataDevolucao(),
        emprestimo.getStatusEmprestimo() ?? true,
        emprestimo.getFormaPagamento() ?? null,
        emprestimo.getIdEmprestimo(),
      ];

      const res = await client.query(query, valores);
      await client.query('COMMIT');
      const idOwner = id_usuario ?? atual.id_usuario ?? 1;
      void CaixaPessoal.recalcularESalvarSaldo(idOwner);
      return (res.rowCount ?? 0) > 0;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`[EmprestimoModel] Erro ao atualizar emprestimo (id: ${emprestimo.getIdEmprestimo()}):`, error);
      throw error;
    } finally {
      client.release();
    }
  }
}