import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

dotenv.config();

const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000');
const max = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '5');

export const loginLimiter = rateLimit({
  windowMs: windowMs,
  max: max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    mensagem: `Muitas tentativas de login. Tente novamente em ${Math.floor(windowMs / 60000)} minutos.`
  },
  skipSuccessfulRequests: true,
});

export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 100, // 100 requisicoes por IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    mensagem: "Muitas requisicoes. Tente novamente em 1 minuto."
  },
});