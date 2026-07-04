import databaseInstance from "./DatabaseModel.js";
import bcrypt from "bcrypt";

const database = databaseInstance.pool;

export interface UsuarioDTO {
  id_usuario: number;
  nome: string;
  email: string;
  senha: string;
  role: string;
  criado_em: Date;
}

export default class Usuario {
  private id_usuario: number = 0;
  private nome: string;
  private email: string;
  private senha: string;
  private role: string;
  private criado_em: Date;

  constructor(
    _nome: string,
    _email: string,
    _senha: string,
    _role: string = "admin",
    _criado_em?: Date
  ) {
    this.nome = _nome;
    this.email = _email;
    this.senha = _senha;
    this.role = _role;
    this.criado_em = _criado_em || new Date();
  }

  public getIdUsuario(): number { return this.id_usuario; }
  public setIdUsuario(id: number): void { this.id_usuario = id; }
  public getNome(): string { return this.nome; }
  public setNome(nome: string): void { this.nome = nome; }
  public getEmail(): string { return this.email; }
  public setEmail(email: string): void { this.email = email; }
  public getSenha(): string { return this.senha; }
  public setSenha(senha: string): void { this.senha = senha; }
  public getRole(): string { return this.role; }
  public setRole(role: string): void { this.role = role; }
  public getCriadoEm(): Date { return this.criado_em; }
  public setCriadoEm(d: Date): void { this.criado_em = d; }

  private static toDTO(row: any): UsuarioDTO {
    return {
      id_usuario: row.id_usuario,
      nome: row.nome,
      email: row.email,
      senha: row.senha,
      role: row.role,
      criado_em: row.criado_em,
    };
  }

  static async buscarPorEmail(email: string): Promise<UsuarioDTO | null> {
    try {
      const query = `SELECT * FROM usuario WHERE email = $1`;
      const res = await database.query(query, [email]);

      if (res.rows.length === 0) {
        return null;
      }

      return Usuario.toDTO(res.rows[0]);
    } catch (error) {
      console.error(`[UsuarioModel] Erro ao buscar usuario por email:`, error);
      throw error;
    }
  }

  static async buscarPorId(id_usuario: number): Promise<UsuarioDTO | null> {
    try {
      const query = `SELECT * FROM usuario WHERE id_usuario = $1`;
      const res = await database.query(query, [id_usuario]);

      if (res.rows.length === 0) {
        return null;
      }

      return Usuario.toDTO(res.rows[0]);
    } catch (error) {
      console.error(`[UsuarioModel] Erro ao buscar usuario por ID:`, error);
      throw error;
    }
  }

  static async cadastrar(usuario: Usuario): Promise<number> {
    try {
      const saltRounds = 10;
      const senhaHash = await bcrypt.hash(usuario.getSenha(), saltRounds);

      const query = `
        INSERT INTO usuario (nome, email, senha, role, criado_em)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id_usuario
      `;

      const valores = [
        usuario.getNome(),
        usuario.getEmail(),
        senhaHash,
        usuario.getRole(),
        usuario.getCriadoEm(),
      ];

      const res = await database.query(query, valores);

      if (res.rows.length === 0) {
        throw new Error("INSERT nao retornou ID.");
      }

      return res.rows[0].id_usuario;
    } catch (error) {
      console.error(`[UsuarioModel] Erro ao cadastrar usuario:`, error);
      throw error;
    }
  }

  static async validarSenha(email: string, senhaPlain: string): Promise<UsuarioDTO | null> {
    try {
      const usuario = await Usuario.buscarPorEmail(email);

      if (!usuario) {
        return null;
      }

      const senhaValida = await bcrypt.compare(senhaPlain, usuario.senha);

      if (!senhaValida) {
        return null;
      }

      return usuario;
    } catch (error) {
      console.error(`[UsuarioModel] Erro ao validar senha:`, error);
      throw error;
    }
  }
}