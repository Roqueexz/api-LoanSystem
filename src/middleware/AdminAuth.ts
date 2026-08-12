import type { Request, Response, NextFunction } from 'express';
import logger from '../services/Logger.js';

export function verifyAdmin(req: Request, res: Response, next: NextFunction): void | Response {
  const usuario = (req as any).usuario;

  if (!usuario || usuario.role !== 'admin') {
    logger.warn({ usuario }, '[AdminAuth] Acesso restrito negado: usuário não é admin');
    return res.status(403).json({
      mensagem: 'Acesso restrito ao administrador do sistema.',
      auth: false,
    });
  }

  next();
}
