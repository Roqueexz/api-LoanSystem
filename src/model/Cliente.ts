import type ClienteDTO from "../interface/ClienteDTO.js";
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

 constructor(
    _nome: string,
    _sobrenome: string,
    _telefone: string,
    _cidade: string,
    _estado: string,
    _criado_em: Date,
) {
    this.nome = _nome;
    this.sobrenome = _sobrenome;
    this.telefone = _telefone;
    this.cidade = _cidade;
    this.estado = _estado;
    this.criado_em = _criado_em;
}
  public getIdCliente(): number {
    return this.id_cliente;
  }
  public setIdCliente(id: number): void {
    this.id_cliente = id;
  }
  public getNome(): string {
    return this.nome;
  }
  public setNome(nome: string): void {
    this.nome = nome;
  }
  public getSobrenome(): string {
    return this.sobrenome;
  }
  public setSobrenome(sobrenome: string): void {
    this.sobrenome = sobrenome;
  }
  public getTelefone(): string {
    return this.telefone;
  }
  public setTelefone(telefone: string): void {
    this.telefone = telefone;
  }
  public getCriadoEm(): Date {
    return this.criado_em;
  }
  public setCriadoEm(criado_em: Date): void {
    this.criado_em = criado_em;
  }
public getCidade(): string {
    return this.cidade;
}

public setCidade(cidade: string): void {
    this.cidade = cidade;
}

public getEstado(): string {
    return this.estado;
}

public setEstado(estado: string): void {
    this.estado = estado;
}

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

  static async listarClientes(
    id_cliente?: number,
  ): Promise<ClienteDTO | ClienteDTO[]> {
    try {
      if (typeof id_cliente === "number") {
        const querySelectCliente = `SELECT * FROM Cliente WHERE id_cliente = $1`;
        const respostaBD = await database.query(querySelectCliente, [
          id_cliente,
        ]);

        if (respostaBD.rows.length === 0) {
          throw new Error(`Cliente com ID ${id_cliente} não encontrado.`);
        }

        return Cliente.toDTO(respostaBD.rows[0]);
      }

      // Lista todos os clientes ativos
      const queryAll = `SELECT * FROM Cliente WHERE status_cliente = TRUE`;
      const respostaAll = await database.query(queryAll);
      return respostaAll.rows.map((r: any) => Cliente.toDTO(r));
    } catch (error) {
      console.error(`[ClienteModel] Erro ao buscar cliente(s):`, error);
      throw error;
    }
  }

  static async cadastrarCliente(cliente: Cliente): Promise<boolean> {
    try {
      // "RETURNING id_cliente" faz o banco retornar o ID gerado automaticamente após o INSERT
      // Isso confirma que o registro foi criado e nos dá o ID para exibir no log
      const queryInsertCliente = `
    INSERT INTO Cliente (
        nome,
        sobrenome,
        telefone,
        cidade,
        estado,
        criado_em
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id_cliente;
`;

      // Os valores são passados separadamente — o banco substitui $1, $2... na ordem do array
      // .toUpperCase() e .toLowerCase() padronizam os dados antes de salvar no banco
      const valores = [
    cliente.getNome().toUpperCase(),
    cliente.getSobrenome().toUpperCase(),
    cliente.getTelefone(),
    cliente.getCidade().toUpperCase(),
    cliente.getEstado().toUpperCase(),
    cliente.getCriadoEm(),
];

      const result = await database.query(queryInsertCliente, valores);
      // Se o RETURNING não retornou nenhuma linha, o INSERT falhou silenciosamente
      if (result.rows.length === 0) {
        throw new Error(
          "INSERT não retornou ID — cadastro pode ter falhado silenciosamente.",
        );
      }

      console.info(
        `[ClienteModel] Cliente cadastrado com sucesso. ID: ${result.rows[0].id_cliente}`,
      );
      return true;
    } catch (error) {
      console.error(`[ClienteModel] Erro ao cadastrar cliente:`, error);
      throw error;
    }
  }

  static async removerCliente(id_cliente: number): Promise<boolean> {
    // "database.connect()" obtém uma conexão dedicada do pool — necessária para usar transações
    // Com o pool padrão (database.query), cada query pode usar uma conexão diferente
    // A transação exige que todas as queries usem a mesma conexão
    const client = await database.connect();

    try {
      const cliente: ClienteDTO = (await Cliente.listarClientes(
        id_cliente,
      )) as ClienteDTO;

      // Se o cliente já está inativo, não há nada a fazer — retorna false sem erro
      if (!cliente.status_cliente) {
        return false;
      }

      // BEGIN inicia a transação — a partir daqui, as queries são agrupadas como uma unidade
      // Ou todas são confirmadas (COMMIT) ou todas são desfeitas (ROLLBACK)
      await client.query("BEGIN");

      // Primeiro desativa os empréstimos relacionados ao aluno
      // A ordem importa: desativar os empréstimos antes do aluno garante consistência nos dados
      await client.query(
        `UPDATE emprestimo SET status_emprestimo_registro = FALSE WHERE id_cliente = $1`,
        [id_cliente],
      );

      // Depois desativa o próprio cliente
      const result = await client.query(
        `UPDATE cliente SET status_cliente = FALSE WHERE id_cliente = $1`,
        [id_cliente],
      );

      // COMMIT confirma as duas operações juntas — só agora as mudanças são salvas no banco
      await client.query("COMMIT");

      // rowCount indica quantas linhas foram afetadas pelo UPDATE
      // "?? 0" trata o caso em que rowCount é null (o que não deveria ocorrer aqui, mas é uma segurança)
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      // Se qualquer etapa falhar, ROLLBACK desfaz tudo — banco volta ao estado anterior
      // Isso evita situações onde os empréstimos foram desativados mas o cliente não (ou vice-versa)
      await client.query("ROLLBACK");
      console.error(
        `[ClienteModel] Erro ao remover cliente (id: ${id_cliente}):`,
        error,
      );
      throw error;
    } finally {
      // "finally" é executado SEMPRE — com erro ou sem erro
      // client.release() devolve a conexão ao pool para ser reutilizada por outras requisições
      // Sem isso, a conexão ficaria ocupada indefinidamente e o pool se esgotaria com o tempo
      client.release();
    }
  }

  static async atualizarCliente(cliente: Cliente): Promise<boolean> {
    try {
      // Verifica se o cliente existe e está ativo antes de tentar atualizar
      // Se listarCliente lançar erro ("não encontrado"), ele será propagado automaticamente
      const clienteConsulta: ClienteDTO = (await Cliente.listarClientes(
        cliente.id_cliente,
      )) as ClienteDTO;

      // Cliente inativo não pode ser atualizado — retorna false sem erro
      if (!clienteConsulta.status_cliente) {
        return false;
      }

      // Cada $n corresponde ao valor na mesma posição do array "valores" abaixo
      // O $7 no WHERE garante que apenas o cliente com o ID correto seja atualizado
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
    cliente.id_cliente,
];

      const respostaBD = await database.query(queryAtualizarCliente, valores);

      // rowCount > 0 confirma que pelo menos uma linha foi alterada no banco
      return (respostaBD.rowCount ?? 0) > 0;
    } catch (error) {
      console.error(
        `[ClienteModel] Erro ao atualizar cliente (id: ${cliente.id_cliente}):`,
        error,
      );
      throw error;
    }
  }
}
