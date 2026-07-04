import express from "express";
import cors from "cors";
import { router } from "./routes.js";
import { apiLimiter } from "./middleware/RateLimiter.js";
import dotenv from "dotenv";

dotenv.config();

const server = express();

// CORS configurado
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'x-access-token'],
  credentials: true,
};

server.use(cors(corsOptions));
server.use(express.json());
server.use('/api', apiLimiter);
server.use(router);

export { server };