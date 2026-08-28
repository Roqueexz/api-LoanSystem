import express from "express";
import cors from "cors";
import { router } from "./routes.js";
import { apiLimiter } from "./middleware/RateLimiter.js";
import { errorHandler } from "./middleware/ErrorHandler.js";
import logger from "./services/Logger.js";
import "./config/env.js";

const NODE_ENV = process.env.NODE_ENV || "development";

// Lista de origins permitidas — suporta múltiplos separados por vírgula
// Ex: FRONTEND_URL=https://interface-loansystem.vercel.app,https://loansystem.meu-dominio.com
const rawOrigins = (process.env.FRONTEND_URL || "").split(",").map(s => s.trim()).filter(Boolean);

// Fallbacks por ambiente — evita o bug de cair no Render quando está em localhost
const defaultOrigins = NODE_ENV === "production"
  ? ["https://interface-loansystem.vercel.app"] // ajuste para o domínio real da Vercel se diferente
  : ["http://localhost:5173", "http://localhost:5174", "http://localhost:3000", "http://127.0.0.1:5173"];

const allowedOrigins = rawOrigins.length > 0 ? rawOrigins : defaultOrigins;

const server = express();

const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
        // Requests sem origin (mobile, curl, health check) são permitidos
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        // Em dev, permite qualquer localhost automaticamente
        if (NODE_ENV !== "production" && origin.startsWith("http://localhost")) return callback(null, true);
        if (NODE_ENV !== "production" && origin.startsWith("http://127.0.0.1")) return callback(null, true);
        logger.warn({ origin, allowedOrigins }, "[CORS] Origin bloqueado");
        return callback(new Error(`CORS bloqueado para origin: ${origin}`));
    },

    methods: [
        "GET",
        "POST",
        "PUT",
        "DELETE",
        "PATCH",
        "OPTIONS"
    ],

    allowedHeaders: [
        "Content-Type",
        "x-access-token",
        "Cache-Control",
        "Pragma",
        "X-Requested-With",
        "Accept",
        "Origin"
    ],

    credentials: true,
};

server.use(cors(corsOptions));

server.use(express.json());

// Sprint 15: servir fotos de conciliação (uploads)
import path from 'path';
import { fileURLToPath } from 'url';
const __filenameServer = fileURLToPath(import.meta.url);
const __dirnameServer = path.dirname(__filenameServer);
server.use('/uploads', express.static(path.resolve(__dirnameServer, '../../interface-LoanSystem/public/uploads')));

server.use("/api", apiLimiter);

server.use(router);

server.use(errorHandler);

export { server };