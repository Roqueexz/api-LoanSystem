import databaseInstance from "./DatabaseModel.js";

export interface ICaixinha {
  id_caixinha: number;
  id_usuario: number;
  nome: string;
  saldo: number;
  meta?: number | null;
  emoji: string;
  cor: string;
  criado_em?: Date;
}

export class Caixinha {
  public static async listar(id_usuario: number): Promise<ICaixinha[]> {
    const query = `
      SELECT id_caixinha, id_usuario, nome, saldo::float, meta::float, emoji, cor, criado_em
      FROM caixinha_pessoal
      WHERE id_usuario = $1
      ORDER BY id_caixinha ASC;
    `;
    const res = await databaseInstance.pool.query(query, [id_usuario]);
    return res.rows;
  }

  public static async obterPorId(id_caixinha: number, id_usuario: number): Promise<ICaixinha | null> {
    const query = `
      SELECT id_caixinha, id_usuario, nome, saldo::float, meta::float, emoji, cor, criado_em
      FROM caixinha_pessoal
      WHERE id_caixinha = $1 AND id_usuario = $2;
    `;
    const res = await databaseInstance.pool.query(query, [id_caixinha, id_usuario]);
    return res.rows[0] || null;
  }

  public static async criar(
    id_usuario: number,
    dados: { nome: string; meta?: number | null; emoji?: string; cor?: string }
  ): Promise<ICaixinha> {
    const emoji = dados.emoji || '🐷';
    const cor = dados.cor || 'indigo';
    const meta = dados.meta || null;

    const query = `
      INSERT INTO caixinha_pessoal (id_usuario, nome, meta, emoji, cor)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id_caixinha, id_usuario, nome, saldo::float, meta::float, emoji, cor, criado_em;
    `;

    const res = await databaseInstance.pool.query(query, [id_usuario, dados.nome, meta, emoji, cor]);
    return res.rows[0];
  }

  public static async depositar(
    id_caixinha: number,
    id_usuario: number,
    valor: number
  ): Promise<ICaixinha | null> {
    const query = `
      UPDATE caixinha_pessoal
      SET saldo = saldo + $3
      WHERE id_caixinha = $1 AND id_usuario = $2
      RETURNING id_caixinha, id_usuario, nome, saldo::float, meta::float, emoji, cor, criado_em;
    `;

    const res = await databaseInstance.pool.query(query, [id_caixinha, id_usuario, valor]);
    return res.rows[0] || null;
  }

  public static async resgatar(
    id_caixinha: number,
    id_usuario: number,
    valor: number
  ): Promise<ICaixinha | null> {
    const query = `
      UPDATE caixinha_pessoal
      SET saldo = GREATEST(saldo - $3, 0)
      WHERE id_caixinha = $1 AND id_usuario = $2
      RETURNING id_caixinha, id_usuario, nome, saldo::float, meta::float, emoji, cor, criado_em;
    `;

    const res = await databaseInstance.pool.query(query, [id_caixinha, id_usuario, valor]);
    return res.rows[0] || null;
  }

  public static async remover(id_caixinha: number, id_usuario: number): Promise<boolean> {
    const query = `
      DELETE FROM caixinha_pessoal
      WHERE id_caixinha = $1 AND id_usuario = $2;
    `;

    const res = await databaseInstance.pool.query(query, [id_caixinha, id_usuario]);
    return (res.rowCount ?? 0) > 0;
  }
}
