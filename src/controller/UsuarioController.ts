import { type Request, type Response } from 'express';
import Usuario from '../model/Usuario.js';
import logger from '../services/Logger.js';
import path from 'path';
import { upload, processImage } from '../middleware/upload.js';

interface JwtPayload {
  id: number;
  nome: string;
  email: string;
  role: string;
}

export class UsuarioController {

  /**
   * GET /api/usuario/perfil
   * Retorna dados do usuário autenticado
   */
  async perfil(req: Request, res: Response): Promise<void> {
    try {
      const payload = (req as any).usuario as JwtPayload;
      const usuario = await Usuario.buscarPorId(payload.id);

      if (!usuario) {
        res.status(404).json({ mensagem: 'Usuário não encontrado.' });
        return;
      }

      res.status(200).json({
        id_usuario: usuario.id_usuario,
        nome: usuario.nome,
        email: usuario.email,
        role: usuario.role,
        criado_em: usuario.criado_em,
      });
    } catch (error) {
      logger.error({ error }, '[UsuarioController] Erro ao buscar perfil');
      res.status(500).json({ mensagem: 'Erro interno do servidor.' });
    }
  }

  /**
   * PUT /api/usuario/perfil
   * Atualiza nome e/ou email do usuário autenticado
   */
  async atualizarPerfil(req: Request, res: Response): Promise<void> {
    try {
      const payload = (req as any).usuario as JwtPayload;
      const { nome, email } = req.body;

      const atualizado = await Usuario.atualizar(payload.id, { nome, email });

      if (!atualizado) {
        res.status(400).json({ mensagem: 'Nenhuma alteração realizada.' });
        return;
      }

      logger.info({ userId: payload.id }, '[UsuarioController] Perfil atualizado');

      res.status(200).json({
        mensagem: 'Perfil atualizado com sucesso.',
        usuario: {
          id_usuario: atualizado.id_usuario,
          nome: atualizado.nome,
          email: atualizado.email,
          role: atualizado.role,
          criado_em: atualizado.criado_em,
        },
      });
    } catch (error) {
      logger.error({ error }, '[UsuarioController] Erro ao atualizar perfil');
      res.status(500).json({ mensagem: 'Erro interno do servidor.' });
    }
  }

  /**
   * PATCH /api/usuario/senha
   * Altera a senha do usuário validando a senha atual
   */
  async alterarSenha(req: Request, res: Response): Promise<void> {
    try {
      const payload = (req as any).usuario as JwtPayload;
      const { senhaAtual, novaSenha } = req.body;

      const sucesso = await Usuario.alterarSenha(payload.id, senhaAtual, novaSenha);

      if (!sucesso) {
        res.status(400).json({ mensagem: 'Senha atual incorreta.' });
        return;
      }

      logger.info({ userId: payload.id }, '[UsuarioController] Senha alterada com sucesso');
      res.status(200).json({ mensagem: 'Senha alterada com sucesso.' });
    } catch (error) {
      logger.error({ error }, '[UsuarioController] Erro ao alterar senha');
      res.status(500).json({ mensagem: 'Erro interno do servidor.' });
    }
  }

  /**
   * GET /api/usuario/atividades
   * Retorna as últimas atividades reais do usuário
   */
  async atividades(req: Request, res: Response): Promise<void> {
    try {
      const payload = (req as any).usuario as JwtPayload;
      const limite = Number(req.query.limite) || 20;

      const dados = await Usuario.atividades(payload.id, limite);

      res.status(200).json({ atividades: dados });
    } catch (error) {
      logger.error({ error }, '[UsuarioController] Erro ao buscar atividades');
      res.status(500).json({ mensagem: 'Erro interno do servidor.' });
    }
  }
  /**
   * PUT /api/usuario/avatar
   * Atualiza a foto de avatar do usuário autenticado.
   */
  async uploadAvatar(req: Request, res: Response): Promise<void> {
    try {
      const payload = (req as any).usuario as JwtPayload;
      // multer middleware should have parsed the file
      if (!req.file) {
        res.status(400).json({ mensagem: 'Arquivo de avatar não fornecido.' });
        return;
      }
      // Process image (resize, convert to WebP)
      const processedPath = await processImage(req.file.path);
      // Build URL relative to public folder
      const filename = path.basename(processedPath);
      const avatarUrl = `/uploads/${filename}`;
      const atualizado = await Usuario.atualizarAvatarUrl(payload.id, avatarUrl);
      if (!atualizado) {
        res.status(500).json({ mensagem: 'Falha ao atualizar avatar.' });
        return;
      }
      logger.info({ userId: payload.id }, '[UsuarioController] Avatar atualizado');
      res.status(200).json({ mensagem: 'Avatar atualizado com sucesso.', avatar_url: avatarUrl });
    } catch (error) {
      logger.error({ error }, '[UsuarioController] Erro ao fazer upload de avatar');
      res.status(500).json({ mensagem: 'Erro interno do servidor.' });
    }
  }
}

export default new UsuarioController();
