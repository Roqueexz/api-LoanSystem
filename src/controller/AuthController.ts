import { type Request, type Response } from 'express';
import { Auth } from '../middleware/Auth.js';

export class AuthController {
    async login(req: Request, res: Response): Promise<void> {
        await Auth.validacaoUsuario(req, res);
    }
}