import { type Request, type Response } from 'express';
import { Auth } from '../middleware/Auth.js';

export class AuthController {
    /**
     * Endpoint para realizar o login do usuário
     */
    async login(req: Request, res: Response): Promise<void> {
        // Encaminha a requisição diretamente para o validador do middleware
        await Auth.validacaoUsuario(req, res);
    }
}