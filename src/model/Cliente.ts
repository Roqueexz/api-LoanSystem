import type ClienteDTO from "../interface/ClienteDTO.js";
import type ResumoClienteDTO from "../interface/ResumoClienteDTO.js";
import databaseInstance from "./DatabaseModel.js";
import Emprestimo from "./Emprestimo.js";
import Parcela from "./Parcela.js";

const database = databaseInstance.pool;

export default class Cliente {
  private id_cliente: number = 0;
  private nome: string;
  private sobrenome: string;
  private telefone: string;
  private cidade: string;
  private estado: string;
  private criado_em: Date;
  private status_cliente: boolean | undefined;

  constructor(
    _nome: string,
    _sobrenome: string,
    _telefone: string,
    _cidade: string,
    _estado: string,
    _criado_em: Date,
    _status_cliente?: boolean
  ) {
    this.nome = _nome;
    this.sobrenome = _sobrenome;
    this.telefone = _telefone;
    this.cidade = _cidade;
    this.estado = _estado;
    this.criado_em = _criado_em;
    this.status_cliente = _status_cliente;
  }

  public getIdCliente(): number { return this.id_cliente; }
  public setIdCliente(id: number): void { this.id_cliente = id; }
  public getNome(): string { return this.nome; }
  public setNome(nome: string): void { this.nome = nome; }
  public getSobrenome(): string { return this.sobrenome; }
  public setSobrenome(sobrenome: string): void { this.sobrenome = sobrenome; }
  public getTelefone(): string { return this.telefone; }
  public setTelefone(telefone: string): void { this.telefone = telefone; }
  public getCriadoEm(): Date { return this.criado_em; }
  public setCriadoEm(criado_em: Date): void { this.criado_em = criado_em; }
  public getCidade(): string { return this.cidade; }
  public setCidade(cidade: string): void { this.cidade = cidade; }
  public getEstado(): string { return this.estado; }
  public setEstado(estado: string): void { this.estado = estado; }
  public getStatusCliente(): boolean | undefined { return this.status_cliente; }
  public setStatusCliente(status: boolean): void { this.status_cliente = status; }

  private static toDTO(cliente: any): ClienteDTO {
    return {
      id_cliente: cliente.id_cliente,
      nome_cliente: cliente.nome,
      sobrenome_cliente: cliente.sobrenome,
      telefone: cliente.telefone,
      cidade: cliente.cidade,
      estado: cliente.estado,
      criado_em: cliente.criado_em,
      status_cliente: cliente.status_cliente,
    };
  }

  static async listarClientes(id_cliente?: number): Promise<ClienteDTO | ClienteDTO[]> {
    try {
      if (typeof id_cliente === "number") {
        const querySelectCliente = `SELECT * FROM Cliente WHERE id_cliente = $1`;
        const respostaBD = await database.query(querySelectCliente, [id_cliente]);

        if (respostaBD.rows.length === 0) {
          throw new Error(`Cliente com ID ${id_cliente} não encontrado.`);
        }

        return Cliente.toDTO(respostaBD.rows[0]);
      }

      const queryAll = `SELECT * FROM Cliente WHERE status_cliente = TRUE`;
      const respostaAll = await database.query(queryAll);
      return respostaAll.rows.map((r: any) => Cliente.toDTO(r));
    } catch (error) {
      console.error(`[ClienteModel] Erro ao buscar cliente(s):`, error);
      throw error;
    }
  }

  static async obterResumo(id_cliente: number): Promise<ResumoClienteDTO> {
    const cliente = (await Cliente.listarClientes(id_cliente)) as ClienteDTO;
    const emprestimos = await Emprestimo.listarEmprestimos('todos', id_cliente);

    const emprestimosComParcelas = await Promise.all(
      emprestimos.map(async (emp) => ({
        ...emp,
        parcelas: await Parcela.listarPorEmprestimo(emp.id_emprestimo!),
      })),
    );

    const todasParcelas = emprestimosComParcelas.flatMap((emp) => emp.parcelas);

    const total_emprestado = emprestimos
      .filter((emp) => emp.status_emprestimo)
      .reduce((acc, emp) => acc + Number(emp.valor_emprestimo), 0);

    const total_recebido = todasParcelas
      .filter((p) => p.status_parcela === 'PAGA')
      .reduce((acc, p) => acc + Number(p.valor_parcela), 0);

    const total_em_aberto = todasParcelas
      .filter((p) => p.status_parcela !== 'PAGA')
      .reduce((acc, p) => acc + Number(p.valor_parcela), 0);

    const total_atrasado = todasParcelas
      .filter((p) => p.status_parcela === 'ATRASADA')
      .reduce((acc, p) => acc + Number(p.valor_parcela), 0);

    return {
      cliente,
      emprestimos: emprestimosComParcelas,
      totais: {
        total_emprestado,
        total_recebido,
        total_em_aberto,
        total_atrasado,
      },
    };
  }

  static async cadastrarCliente(cliente: Cliente): Promise<boolean> {
    try {
      const queryInsertCliente = `
        INSERT INTO Cliente (nome, sobrenome, telefone, cidade, estado, criado_em)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id_cliente;
      `;

      const valores = [
        cliente.getNome().toUpperCase(),
        cliente.getSobrenome().toUpperCase(),
        cliente.getTelefone(),
        cliente.getCidade().toUpperCase(),
        cliente.getEstado().toUpperCase(),
        cliente.getCriadoEm(),
      ];

      const result = await database.query(queryInsertCliente, valores);
      if (result.rows.length === 0) {
        throw new Error("INSERT não retornou ID — cadastro pode ter falhado silenciosamente.");
      }

      console.info(`[ClienteModel] Cliente cadastrado com sucesso. ID: ${result.rows[0].id_cliente}`);
      return true;
    } catch (error) {
      console.error(`[ClienteModel] Erro ao cadastrar cliente:`, error);
      throw error;
    }
  }

  static async removerCliente(id_cliente: number): Promise<boolean> {
    const client = await database.connect();

    try {
      const cliente: ClienteDTO = (await Cliente.listarClientes(id_cliente)) as ClienteDTO;

      if (!cliente.status_cliente) {
        return false;
      }

      await client.query("BEGIN");

      await Parcela.excluirPendentesPorCliente(id_cliente, client);

      await client.query(
        `UPDATE Emprestimo SET status_emprestimo = FALSE WHERE id_cliente = $1`,
        [id_cliente]
      );

      const result = await client.query(
        `UPDATE Cliente SET status_cliente = FALSE WHERE id_cliente = $1`,
        [id_cliente]
      );

      await client.query("COMMIT");
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      await client.query("ROLLBACK");
      console.error(`[ClienteModel] Erro ao remover cliente (id: ${id_cliente}):`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async atualizarCliente(cliente: Cliente): Promise<boolean> {
    try {
      const clienteConsulta: ClienteDTO = (await Cliente.listarClientes(cliente.getIdCliente())) as ClienteDTO;

      if (!clienteConsulta.status_cliente) {
        return false;
      }

      const queryAtualizarCliente = `
        UPDATE Cliente SET
            nome = $1,
            sobrenome = $2,
            telefone = $3,
            cidade = $4,
            estado = $5
        WHERE id_cliente = $6
      `;

      const valores = [
        cliente.getNome().toUpperCase(),
        cliente.getSobrenome().toUpperCase(),
        cliente.getTelefone(),
        cliente.getCidade().toUpperCase(),
        cliente.getEstado().toUpperCase(),
        cliente.getIdCliente(),
      ];

      const respostaBD = await database.query(queryAtualizarCliente, valores);
      return (respostaBD.rowCount ?? 0) > 0;
    } catch (error) {
      console.error(`[ClienteModel] Erro ao atualizar cliente (id: ${cliente.getIdCliente()}):`, error);
      throw error;
    }
  }
}
