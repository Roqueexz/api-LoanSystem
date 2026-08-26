import type ClienteDTO from "../interface/ClienteDTO.js";
import type ResumoClienteDTO from "../interface/ResumoClienteDTO.js";
import Emprestimo from "./Emprestimo.js";
import Parcela from "./Parcela.js";
import { capitalizar, formatarTelefone } from '../services/Utilitario.js';
import { DatabaseModel } from "./DatabaseModel.js";

const database = new DatabaseModel().pool;

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
    this.nome = capitalizar(_nome);
    this.sobrenome = capitalizar(_sobrenome);
    this.telefone = _telefone;
    this.cidade = capitalizar(_cidade);
    this.estado = _estado.toUpperCase();
    this.criado_em = _criado_em;
    this.status_cliente = _status_cliente;
  }

  public getIdCliente(): number { return this.id_cliente; }
  public setIdCliente(id: number): void { this.id_cliente = id; }
  public getNome(): string { return this.nome; }
  public setNome(nome: string): void { this.nome = capitalizar(nome); }
  public getSobrenome(): string { return this.sobrenome; }
  public setSobrenome(sobrenome: string): void { this.sobrenome = capitalizar(sobrenome); }
  public getTelefone(): string { return this.telefone; }
  public setTelefone(telefone: string): void { this.telefone = telefone; }
  public getCriadoEm(): Date { return this.criado_em; }
  public setCriadoEm(criado_em: Date): void { this.criado_em = criado_em; }
  public getCidade(): string { return this.cidade; }
  public setCidade(cidade: string): void { this.cidade = capitalizar(cidade); }
  public getEstado(): string { return this.estado; }
  public setEstado(estado: string): void { this.estado = estado.toUpperCase(); }
  public getStatusCliente(): boolean | undefined { return this.status_cliente; }
  public setStatusCliente(status: boolean): void { this.status_cliente = status; }

  private static toDTO(cliente: any): ClienteDTO {
    return {
      id_cliente: cliente.id_cliente,
      nome_cliente: cliente.nome,
      sobrenome_cliente: cliente.sobrenome,
      telefone: formatarTelefone(cliente.telefone),
      cidade: cliente.cidade,
      estado: cliente.estado,
      criado_em: cliente.criado_em,
      status_cliente: cliente.status_cliente,
    };
  }

  static async listarClientes(
    id_usuario: number,
    id_cliente?: number,
  ): Promise<ClienteDTO | ClienteDTO[]> {
    try {
      if (typeof id_cliente === "number") {
        // 🔥 FILTRA POR id_usuario
        const querySelectCliente = `
          SELECT * FROM Cliente
          WHERE id_cliente = $1 AND id_usuario = $2 AND status_cliente = TRUE
        `;
        const respostaBD = await database.query(querySelectCliente, [id_cliente, id_usuario]);
  
        if (respostaBD.rows.length === 0) {
          throw new Error(`Cliente com ID ${id_cliente} não encontrado.`);
        }
  
        return Cliente.toDTO(respostaBD.rows[0]);
      }
  
      // 🔥 FILTRA POR id_usuario
      const queryAll = `
        SELECT * FROM Cliente
        WHERE id_usuario = $1 AND status_cliente = TRUE
        ORDER BY id_cliente DESC
      `;
      const respostaAll = await database.query(queryAll, [id_usuario]);
      return respostaAll.rows.map((r: any) => Cliente.toDTO(r));
    } catch (error) {
      console.error(`[ClienteModel] Erro ao buscar cliente(s):`, error);
      throw error;
    }
  }
  

  static async obterResumo(id_cliente: number, id_usuario: number): Promise<ResumoClienteDTO> {
    // 🔥 VERIFICA OWNERSHIP
    const cliente = (await Cliente.listarClientes(id_usuario, id_cliente)) as ClienteDTO;
    
    // 🔥 PASSA id_usuario PARA O EMPRÉSTIMO (3 argumentos)
    const emprestimos = await Emprestimo.listarEmprestimos('todos', id_cliente, id_usuario);
  
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

  static async cadastrarCliente(cliente: Cliente, id_usuario: number): Promise<number> {
    try {
      console.log('[DEBUG] ===== INICIO CADASTRO CLIENTE MODEL =====');
      console.log('[DEBUG] id_usuario recebido:', id_usuario);
      console.log('[DEBUG] Tipo de id_usuario:', typeof id_usuario);
      
      const valores = [
        id_usuario,
        cliente.getNome(),
        cliente.getSobrenome(),
        cliente.getTelefone(),
        cliente.getCidade(),
        cliente.getEstado(),
        cliente.getCriadoEm(),
      ];
  
      console.log('[DEBUG] Valores para INSERT:', valores.map((v, i) => `$${i+1}: ${v}`).join(', '));
  
      const queryInsertCliente = `
        INSERT INTO Cliente (id_usuario, nome, sobrenome, telefone, cidade, estado, criado_em)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id_cliente;
      `;
  
      console.log('[DEBUG] Query SQL:', queryInsertCliente);
      console.log('[DEBUG] Executando query...');
  
      const result = await database.query(queryInsertCliente, valores);
      console.log('[DEBUG] Resultado da query:', result);
      console.log('[DEBUG] rows:', result.rows);
      console.log('[DEBUG] rowCount:', result.rowCount);
  
      if (result.rows.length === 0) {
        console.error('[DEBUG] INSERT nao retornou ID');
        throw new Error("INSERT não retornou ID — cadastro pode ter falhado silenciosamente.");
      }
  
      const id_cliente = result.rows[0].id_cliente as number;
      console.log(`[ClienteModel] Cliente cadastrado com sucesso. ID: ${id_cliente}, usuario: ${id_usuario}`);
      return id_cliente;
    } catch (error) {
      console.error('[DEBUG] ===== ERRO NO MODEL =====');
      console.error('[DEBUG] Erro detalhado:', error);
      if (error instanceof Error) {
        console.error('[DEBUG] Mensagem:', error.message);
        console.error('[DEBUG] Stack:', error.stack);
      }
      throw error;
    }
  }
  static async removerCliente(id_cliente: number, id_usuario: number): Promise<boolean> {
    const client = await database.connect();
  
    try {
      // 🔥 VERIFICA OWNERSHIP
      const cliente: ClienteDTO = (await Cliente.listarClientes(id_usuario, id_cliente)) as ClienteDTO;
  
      if (!cliente.status_cliente) {
        return false;
      }
  
      const queryPagas = `
        SELECT COUNT(*)::int AS total
        FROM Parcela p
        JOIN Emprestimo e ON p.id_emprestimo = e.id_emprestimo
        WHERE e.id_cliente = $1 AND e.id_usuario = $2 AND p.status_parcela = 'PAGA'
      `;
      const resultPagas = await client.query(queryPagas, [id_cliente, id_usuario]);
      const pagas = resultPagas.rows[0]?.total ?? 0;
  
      if (pagas > 0) {
        throw new Error(
          `Não é possível inativar cliente com ${pagas} parcela(s) paga(s). ` +
          `Para remover, primeiro desfaça os pagamentos.`
        );
      }
  
      await client.query("BEGIN");
  
      await Parcela.excluirPendentesPorCliente(id_cliente, client);
  
      await client.query(
        `UPDATE Emprestimo SET status_emprestimo = FALSE WHERE id_cliente = $1 AND id_usuario = $2`,
        [id_cliente, id_usuario]
      );
  
      const result = await client.query(
        `UPDATE Cliente SET status_cliente = FALSE WHERE id_cliente = $1 AND id_usuario = $2`,
        [id_cliente, id_usuario]
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
  

  static async atualizarCliente(cliente: Cliente, id_usuario: number): Promise<boolean> {
    try {
      // 🔥 VERIFICA OWNERSHIP
      const clienteConsulta: ClienteDTO = (await Cliente.listarClientes(
        id_usuario,
        cliente.getIdCliente(),
      )) as ClienteDTO;
  
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
        WHERE id_cliente = $6 AND id_usuario = $7
      `;
  
      const valores = [
        cliente.getNome(),
        cliente.getSobrenome(),
        cliente.getTelefone(),
        cliente.getCidade(),
        cliente.getEstado(),
        cliente.getIdCliente(),
        id_usuario,  // 🔥 VERIFICA OWNERSHIP
      ];
  
      const respostaBD = await database.query(queryAtualizarCliente, valores);
      return (respostaBD.rowCount ?? 0) > 0;
    } catch (error) {
      console.error(`[ClienteModel] Erro ao atualizar cliente (id: ${cliente.getIdCliente()}):`, error);
      throw error;
    }
  }
}
