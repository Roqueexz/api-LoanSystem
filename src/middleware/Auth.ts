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

        if (!email || !senha) {
            logger.warn({ email }, 'Tentativa de login sem email ou senha');
            return res.status(400).json({
                auth: false,
                message: "Email e senha sao obrigatorios."
            });
        }

        if (!isEmailValido(email)) {
            logger.warn({ email }, 'Tentativa de login com email invalido');
            return res.status(400).json({
                auth: false,
                message: "Email invalido. Por favor, insira um email valido."
            });
        }

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

            if (usuario.ativo === false) {
                logger.warn({ email }, 'Tentativa de login de usuario suspenso');
                return res.status(403).json({
                    auth: false,
                    message: "Conta suspensa. Entre em contato com o administrador."
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

            console.log('[DEBUG AUTH] Login realizado com sucesso. ID:', usuario.id_usuario, 'Email:', usuario.email);

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
        console.log('[DEBUG AUTH] Gerando token para ID:', id, 'Role:', role);
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

        jwt.verify(token, SECRET, async (err, decoded) => {
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

            console.log('[DEBUG AUTH] Token verificado - ID do usuario:', id);

            try {
                const usuario = await Usuario.buscarPorId(id);
                console.log('[DEBUG AUTH] Usuario encontrado no DB:', usuario ? 'Sim' : 'Nao');
                
                if (!usuario || usuario.ativo === false) {
                    logger.warn({ id }, 'Acesso negado: conta suspensa ou inexistente');
                    return res.status(403).json({
                        message: "Conta suspensa. Entre em contato com o administrador.",
                        auth: false
                    });
                }

                (req as any).usuario = { ...(decoded as JwtPayload), role: usuario.role };
                console.log('[DEBUG AUTH] Usuario injetado no req:', (req as any).usuario);
                
                next();
            } catch (dbErr) {
                logger.error({ dbErr, id }, 'Erro ao verificar status do usuario no middleware Auth');
                (req as any).usuario = decoded;
                next();
            }
        });
    }
}