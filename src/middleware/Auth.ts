import jwt from 'jsonwebtoken';
import { type Request, type Response, type NextFunction } from 'express';
import Usuario from '../model/Usuario.js';
import logger from '../services/Logger.js';
import { isEmailValido, isStringValida } from '../services/Utilitario.js';
import dotenv from 'dotenv';

dotenv.config();

const SECRET = process.env.JWT_SECRET || 'sistemaLoan1984';

interface JwtPayload {
    id: number;
    nome: string;
    email: string;
    role: string;
    exp: number;
}

export class Auth {

    static async validacaoUsuario(req: Request, res: Response): Promise<any> {
        const { email, senha } = req.body;

        // Validar email e senha com Utilitario
        if (!email || !senha) {
            logger.warn({ email }, 'Tentativa de login sem email ou senha');
            return res.status(400).json({
                auth: false,
                message: "Email e senha sao obrigatorios."
            });
        }

        // Validar formato do email
        if (!isEmailValido(email)) {
            logger.warn({ email }, 'Tentativa de login com email invalido');
            return res.status(400).json({
                auth: false,
                message: "Email invalido. Por favor, insira um email valido."
            });
        }

        // Validar tamanho minimo da senha
        if (!isStringValida(senha) || senha.length < 6) {
            logger.warn({ email }, 'Tentativa de login com senha muito curta');
            return res.status(400).json({
                auth: false,
                message: "A senha deve ter pelo menos 6 caracteres."
            });
        }

        try {
            const usuario = await Usuario.validarSenha(email, senha);

            if (!usuario) {
                logger.warn({ email }, 'Tentativa de login com credenciais invalidas');
                return res.status(401).json({
                    auth: false,
                    message: "Email e/ou senha incorretos"
                });
            }

            const usuarioResponse = {
                id_usuario: usuario.id_usuario,
                nome: usuario.nome,
                email: usuario.email,
                role: usuario.role
            };

            const tokenUsuario = Auth.generateToken(
                usuario.id_usuario,
                usuario.nome,
                usuario.email,
                usuario.role
            );

            logger.info({ userId: usuario.id_usuario, email: usuario.email }, 'Login realizado com sucesso');

            return res.status(200).json({
                auth: true,
                token: tokenUsuario,
                usuario: usuarioResponse
            });

        } catch (error) {
            logger.error({ error, email }, 'Erro no login');
            return res.status(500).json({
                auth: false,
                message: "Erro interno do servidor"
            });
        }
    }

    static generateToken(id: number, nome: string, email: string, role: string): string {
        return jwt.sign(
            { id, nome, email, role },
            SECRET,
            { expiresIn: '8h' }
        );
    }

    static verifyToken(req: Request, res: Response, next: NextFunction): void | Response {
        const token = req.headers['x-access-token'] as string;

        if (!token) {
            logger.warn('Token nao informado na requisicao');
            return res.status(401).json({
                message: "Token nao informado",
                auth: false
            });
        }

        jwt.verify(token, SECRET, (err, decoded) => {
            if (err) {
                if (err.name === 'TokenExpiredError') {
                    logger.warn({ token }, 'Token expirado');
                    return res.status(401).json({
                        message: "Token expirado, faca o login novamente",
                        auth: false
                    });
                } else {
                    logger.warn({ token }, 'Token invalido');
                    return res.status(401).json({
                        message: "Token invalido, faca o login",
                        auth: false
                    });
                }
            }

            if (!decoded) {
                logger.warn('Token nao pode ser decodificado');
                return res.status(401).json({
                    message: "Token invalido, faca o login",
                    auth: false
                });
            }

            const { exp, id } = decoded as JwtPayload;

            if (!exp || !id) {
                logger.warn('Data de expiracao ou ID nao encontrada no token');
                return res.status(401).json({
                    message: "Token invalido, faca o login",
                    auth: false
                });
            }

            const currentTime = Math.floor(Date.now() / 1000);
            if (currentTime > exp) {
                logger.warn({ token }, 'Token expirado');
                return res.status(401).json({
                    message: "Token expirado, faca o login novamente",
                    auth: false
                });
            }

            (req as any).usuario = decoded;
            next();
        });
    }
}