import type EmprestimoDTO from '../interface/EmprestimoDTO.js';
import { DatabaseModel } from './DatabaseModel.js';

const database = new DatabaseModel().pool;

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

  // Getters e Setters
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

  // Ajustado para bater certinho com a interface EmprestimoDTO
  private static toDTO(row: any): EmprestimoDTO {
    return {
      id_emprestimo: row.id_emprestimo,
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
      forma_pagamento: row.forma_pagamento ?? null,
    };
  }

  static async listarEmprestimos(): Promise<EmprestimoDTO[]> {
    try {
      // Corrigido: status_emprestimo em vez de status_emprestimo_registro
      const query = `
        SELECT e.*, c.nome AS nome_cliente, c.sobrenome AS sobrenome_cliente
        FROM Emprestimo e
        JOIN Cliente c ON e.id_cliente = c.id_cliente
        WHERE e.status_emprestimo = TRUE
      `;
      const res = await database.query(query);
      return res.rows.map((r: any) => Emprestimo.toDTO(r));
    } catch (error) {
      console.error('[EmprestimoModel] Erro ao listar emprestimos:', error);
      throw error;
    }
  }

  static async listarEmprestimo(id_emprestimo: number): Promise<EmprestimoDTO> {
    try {
      const query = `
        SELECT e.*, c.nome AS nome_cliente, c.sobrenome AS sobrenome_cliente
        FROM Emprestimo e
        JOIN Cliente c ON e.id_cliente = c.id_cliente
        WHERE e.id_emprestimo = $1
      `;
      const res = await database.query(query, [id_emprestimo]);

      if (res.rows.length === 0) {
        throw new Error(`Empréstimo com ID ${id_emprestimo} não encontrado.`);
      }

      return Emprestimo.toDTO(res.rows[0]);
    } catch (error) {
      console.error(`[EmprestimoModel] Erro ao buscar emprestimo (id: ${id_emprestimo}):`, error);
      throw error;
    }
  }

  static async cadastrarEmprestimo(emprestimo: Emprestimo): Promise<boolean> {
    try {
      const query = `
        INSERT INTO Emprestimo (
          id_cliente, valor_emprestimo, num_parcelas, valor_parcela, tipo_juros, juros,
          data_emprestimo, data_devolucao, status_emprestimo, forma_pagamento
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        RETURNING id_emprestimo;
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
      ];

      const result = await database.query(query, valores);
      if (result.rows.length === 0) {
        throw new Error('INSERT não retornou ID.');
      }

      console.info(`[EmprestimoModel] Empréstimo cadastrado. ID: ${result.rows[0].id_emprestimo}`);
      return true;
    } catch (error) {
      console.error('[EmprestimoModel] Erro ao cadastrar emprestimo:', error);
      throw error;
    }
  }

  static async removerEmprestimo(id_emprestimo: number): Promise<boolean> {
    try {
      // Corrigido nome da coluna status
      const query = `UPDATE Emprestimo SET status_emprestimo = FALSE WHERE id_emprestimo = $1`;
      const res = await database.query(query, [id_emprestimo]);
      return (res.rowCount ?? 0) > 0;
    } catch (error) {
      console.error(`[EmprestimoModel] Erro ao remover emprestimo (id: ${id_emprestimo}):`, error);
      throw error;
    }
  }

  static async atualizarEmprestimo(emprestimo: Emprestimo): Promise<boolean> {
    try {
      const consulta = await Emprestimo.listarEmprestimo(emprestimo.getIdEmprestimo());
      if (!consulta) return false;

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

      const res = await database.query(query, valores);
      return (res.rowCount ?? 0) > 0;
    } catch (error) {
      console.error(`[EmprestimoModel] Erro ao atualizar emprestimo (id: ${emprestimo.getIdEmprestimo()}):`, error);
      throw error;
    }
  }
}