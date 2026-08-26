import { type Request, type Response } from 'express';
import { Auth } from '../middleware/Auth.js';
import logger from '../services/Logger.js';

export class AuthController {
    async login(req: Request, res: Response): Promise<void> {
        try {
            // Zod valida os dados
            await Auth.validacaoUsuario(req, res);
        } catch (error) {
            logger.error({ error }, '[AuthController] Erro no login');
            res.status(500).json({
                auth: false,
                message: 'Erro interno do servidor.'
            });
        }
    }
}