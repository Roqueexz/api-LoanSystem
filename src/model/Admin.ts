import databaseInstance from './DatabaseModel.js';
import bcrypt from 'bcrypt';
import { capitalizar } from '../services/Utilitario.js';

export interface ResumoGlobalDTO {
  totalCredores: number;
  credoresAtivos: number;
  totalClientes: number;
  totalEmprestimos: number;
  volumeTotal: number;
}

export interface CredorDTO {
  id_usuario: number;
  nome: string;
  email: string;
  role: string;
  ativo: boolean;
  criado_em: Date;
  avatar_url?: string | null;
  total_clientes: number;
  total_emprestimos: number;
  volume_emprestimos: number;
}

export class Admin {
  public static async resumoGlobal(): Promise<ResumoGlobalDTO> {
    const pool = databaseInstance.pool;

    const queryCredores = `
      SELECT 
        COUNT(*)::int AS total_credores,
        COUNT(*) FILTER (WHERE ativo = true)::int AS credores_ativos
      FROM usuario
      WHERE role = 'credor' OR role = 'admin';
    `;

    const queryClientes = `SELECT COUNT(*)::int AS total_clientes FROM cliente;`;
    const queryEmprestimos = `
      SELECT 
        COUNT(*)::int AS total_emprestimos,
        COALESCE(SUM(valor_emprestimo), 0)::float AS volume_total
      FROM emprestimo;
    `;

    const [resCredores, resClientes, resEmprestimos] = await Promise.all([
      pool.query(queryCredores),
      pool.query(queryClientes),
      pool.query(queryEmprestimos),
    ]);

    return {
      totalCredores: resCredores.rows[0]?.total_credores || 0,
      credoresAtivos: resCredores.rows[0]?.credores_ativos || 0,
      totalClientes: resClientes.rows[0]?.total_clientes || 0,
      totalEmprestimos: resEmprestimos.rows[0]?.total_emprestimos || 0,
      volumeTotal: resEmprestimos.rows[0]?.volume_total || 0,
    };
  }

  public static async listarCredores(): Promise<CredorDTO[]> {
    const pool = databaseInstance.pool;

    const query = `
      SELECT 
        u.id_usuario,
        u.nome,
        u.email,
        u.role,
        u.ativo,
        u.criado_em,
        u.avatar_url,
        COUNT(DISTINCT c.id_cliente)::int AS total_clientes,
        COUNT(DISTINCT e.id_emprestimo)::int AS total_emprestimos,
        COALESCE(SUM(e.valor_emprestimo), 0)::float AS volume_emprestimos
      FROM usuario u
      LEFT JOIN cliente c ON c.id_usuario = u.id_usuario
      LEFT JOIN emprestimo e ON e.id_usuario = u.id_usuario
      GROUP BY u.id_usuario, u.nome, u.email, u.role, u.ativo, u.criado_em, u.avatar_url
      ORDER BY u.id_usuario ASC;
    `;

    const res = await pool.query(query);
    return res.rows;
  }

  public static async criarCredor(dados: { nome: string; email: string; senha: string }): Promise<CredorDTO> {
    const pool = databaseInstance.pool;
    const nome = capitalizar(dados.nome);
    const email = dados.email.toLowerCase().trim();
    const hash = await bcrypt.hash(dados.senha, 10);

    const query = `
      INSERT INTO usuario (nome, email, senha, role, ativo)
      VALUES ($1, $2, $3, 'credor', true)
      RETURNING id_usuario, nome, email, role, ativo, criado_em, avatar_url;
    `;

    const res = await pool.query(query, [nome, email, hash]);
    const row = res.rows[0];

    return {
      id_usuario: row.id_usuario,
      nome: row.nome,
      email: row.email,
      role: row.role,
      ativo: row.ativo,
      criado_em: row.criado_em,
      avatar_url: row.avatar_url,
      total_clientes: 0,
      total_emprestimos: 0,
      volume_emprestimos: 0,
    };
  }

  public static async suspenderCredor(id_usuario: number): Promise<boolean> {
    const pool = databaseInstance.pool;
    const query = `UPDATE usuario SET ativo = false WHERE id_usuario = $1 AND role != 'admin' RETURNING id_usuario;`;
    const res = await pool.query(query, [id_usuario]);
    return (res.rowCount ?? 0) > 0;
  }

  public static async reativarCredor(id_usuario: number): Promise<boolean> {
    const pool = databaseInstance.pool;
    const query = `UPDATE usuario SET ativo = true WHERE id_usuario = $1 RETURNING id_usuario;`;
    const res = await pool.query(query, [id_usuario]);
    return (res.rowCount ?? 0) > 0;
  }

  public static async removerCredor(id_usuario: number): Promise<boolean> {
    const pool = databaseInstance.pool;
    const query = `DELETE FROM usuario WHERE id_usuario = $1 AND role != 'admin';`;
    const res = await pool.query(query, [id_usuario]);
    return (res.rowCount ?? 0) > 0;
  }
}
