import express from "express";
import cors from "cors";
import { router } from "./routes.js";
import { apiLimiter } from "./middleware/RateLimiter.js";

const server = express();

server.use(cors());
server.use(express.json());

// Aplica rate limit em todas as rotas da API
server.use('/api', apiLimiter);

server.use(router);

export { server };