import databaseInstance from "./DatabaseModel.js";
import bcrypt from "bcrypt";
import { capitalizar, isEmailValido } from '../services/Utilitario.js';

const database = databaseInstance.pool;

export interface UsuarioDTO {
  id_usuario: number;
  nome: string;
  email: string;
  senha: string;
  role: string;
  criado_em: Date;
  avatar_url?: string | null;
}

export default class Usuario {
  private id_usuario: number = 0;
  private nome: string;
  private email: string;
  private senha: string;
  private role: string;
  private criado_em: Date;
  private avatar_url?: string | null;

  constructor(
    _nome: string,
    _email: string,
    _senha: string,
    _role: string = "admin",
    _criado_em?: Date
  ) {
    this.nome = capitalizar(_nome);
    this.email = _email.toLowerCase().trim();
    this.senha = _senha;
    this.role = _role;
    this.criado_em = _criado_em || new Date();
  }

  public getIdUsuario(): number { return this.id_usuario; }
  public setIdUsuario(id: number): void { this.id_usuario = id; }
  public getAvatarUrl(): string | null | undefined { return this.avatar_url; }
  public setAvatarUrl(url: string | null): void { this.avatar_url = url; }
  public getNome(): string { return this.nome; }
  public setNome(nome: string): void { this.nome = capitalizar(nome); }
  public getEmail(): string { return this.email; }
  public setEmail(email: string): void { this.email = email.toLowerCase().trim(); }
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
      criado_em: row.created_em ?? row.criado_em,
      avatar_url: row.avatar_url ?? null,
    };
  }

  /**
   * Valida se o email é valido antes de buscar
   */
  private static validarEmail(email: string): void {
    if (!isEmailValido(email)) {
      throw new Error('Email invalido. Por favor, insira um email valido.');
    }
  }

  static async buscarPorEmail(email: string): Promise<UsuarioDTO | null> {
    try {
      Usuario.validarEmail(email);
      const emailLower = email.toLowerCase().trim();

      const query = `SELECT * FROM usuario WHERE email = $1`;
      const res = await database.query(query, [emailLower]);

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
      // Validar email antes de cadastrar
      Usuario.validarEmail(usuario.getEmail());

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
      Usuario.validarEmail(email);
      const emailLower = email.toLowerCase().trim();

      const usuario = await Usuario.buscarPorEmail(emailLower);

      if (!usuario) {
        return null;
      }

      const senhaValida = await bcrypt.compare(senhaPlain, usuario.senha);

      // Se a comparação falhar, pode ser que a senha esteja armazenada em texto puro
      // (legado). Em caso de igualdade direta, re-hash e atualize o registro no DB.
      if (!senhaValida) {
        // Upgrade de senha legada: se a senha armazenada coincidir com a senha em texto,
        // hash-e e persista no banco para futuras comparações.
        if (usuario.senha === senhaPlain) {
          try {
            const saltRounds = 10;
            const novaHash = await bcrypt.hash(senhaPlain, saltRounds);
            const queryUpdate = `UPDATE usuario SET senha = $1 WHERE id_usuario = $2`;
            await database.query(queryUpdate, [novaHash, usuario.id_usuario]);
            // atualiza objeto retornado para refletir hash (não expor senha depois)
            usuario.senha = novaHash;
            return usuario;
          } catch (err) {
            console.error('[UsuarioModel] Erro ao atualizar senha legado:', err);
            return null;
          }
        }

        return null;
      }

      return usuario;
    } catch (error) {
      console.error(`[UsuarioModel] Erro ao validar senha:`, error);
      throw error;
    }
  }

  /**
   * Atualiza nome e/ou email do usuário
   */
  static async atualizar(id_usuario: number, dados: { nome?: string; email?: string }): Promise<UsuarioDTO | null> {
    try {
      const setClauses: string[] = [];
      const valores: any[] = [];
      let idx = 1;

      if (dados.nome) {
        setClauses.push(`nome = $${idx++}`);
        valores.push(capitalizar(dados.nome));
      }
      if (dados.email) {
        Usuario.validarEmail(dados.email);
        setClauses.push(`email = $${idx++}`);
        valores.push(dados.email.toLowerCase().trim());
      }

      if (setClauses.length === 0) return null;

      valores.push(id_usuario);
      const query = `UPDATE usuario SET ${setClauses.join(', ')} WHERE id_usuario = $${idx} RETURNING id_usuario, nome, email, role, criado_em, avatar_url`;
      const res = await database.query(query, valores);

      if (res.rows.length === 0) return null;
      const row = res.rows[0];
      return {
        id_usuario: row.id_usuario,
        nome: row.nome,
        email: row.email,
        senha: '',
        role: row.role,
        criado_em: row.criado_em,
        avatar_url: row.avatar_url ?? null,
      };
    } catch (error) {
      console.error(`[UsuarioModel] Erro ao atualizar usuario:`, error);
      throw error;
    }
  }

  static async atualizarAvatarUrl(id_usuario: number, avatar_url: string | null): Promise<UsuarioDTO | null> {
    try {
      const query = `UPDATE usuario SET avatar_url = $2 WHERE id_usuario = $1 RETURNING id_usuario, nome, email, role, criado_em, avatar_url`;
      const res = await database.query(query, [id_usuario, avatar_url]);
      if (res.rows.length === 0) return null;
      const row = res.rows[0];
      return {
        id_usuario: row.id_usuario,
        nome: row.nome,
        email: row.email,
        senha: '',
        role: row.role,
        criado_em: row.criado_em,
        avatar_url: row.avatar_url ?? null,
      };
    } catch (error) {
      console.error(`[UsuarioModel] Erro ao atualizar avatar_url:`, error);
      throw error;
    }
  }

  /**
   * Altera a senha do usuário validando a senha atual
   */
  static async alterarSenha(id_usuario: number, senhaAtual: string, novaSenha: string): Promise<boolean> {
    try {
      const query = `SELECT senha FROM usuario WHERE id_usuario = $1`;
      const res = await database.query(query, [id_usuario]);

      if (res.rows.length === 0) return false;

      const senhaHash = res.rows[0].senha;
      const senhaValida = await bcrypt.compare(senhaAtual, senhaHash) ||
        senhaHash === senhaAtual; // suporte a senhas legadas

      if (!senhaValida) return false;

      const saltRounds = 10;
      const novaHash = await bcrypt.hash(novaSenha, saltRounds);
      await database.query(`UPDATE usuario SET senha = $1 WHERE id_usuario = $2`, [novaHash, id_usuario]);
      return true;
    } catch (error) {
      console.error(`[UsuarioModel] Erro ao alterar senha:`, error);
      throw error;
    }
  }

  /**
   * Retorna as últimas atividades reais do usuário
   * (clientes cadastrados, empréstimos, movimentações de caixa)
   */
  static async atividades(id_usuario: number, limite: number = 20): Promise<Array<{
    tipo: string;
    descricao: string;
    detalhe: string;
    criado_em: Date;
  }>> {
    try {
      const query = `
        SELECT tipo, descricao, detalhe, criado_em FROM (
          -- Clientes cadastrados
          SELECT
            'cliente' AS tipo,
            'Cliente cadastrado' AS descricao,
            nome AS detalhe,
            criado_em
          FROM cliente
          WHERE id_usuario = $1

          UNION ALL

          -- Empréstimos registrados
          SELECT
            'emprestimo' AS tipo,
            'Empréstimo registrado' AS descricao,
            CONCAT(c.nome, ' — R$ ', TO_CHAR(e.valor, 'FM999G999G990D00')) AS detalhe,
            e.criado_em
          FROM emprestimo e
          JOIN cliente c ON c.id_cliente = e.id_cliente
          WHERE e.id_usuario = $1

          UNION ALL

          -- Movimentações do caixa pessoal
          SELECT
            CASE WHEN tipo = 'entrada' THEN 'recebimento' ELSE 'saida' END AS tipo,
            CASE WHEN tipo = 'entrada' THEN 'Recebimento registrado' ELSE 'Saída registrada' END AS descricao,
            CONCAT(descricao, ' — R$ ', TO_CHAR(valor, 'FM999G999G990D00')) AS detalhe,
            criado_em
          FROM movimentacao_caixa_pessoal
          WHERE id_usuario = $1
        ) atividades
        ORDER BY criado_em DESC
        LIMIT $2
      `;

      const res = await database.query(query, [id_usuario, limite]);
      return res.rows;
    } catch (error) {
      console.error(`[UsuarioModel] Erro ao buscar atividades:`, error);
      throw error;
    }
  }
}