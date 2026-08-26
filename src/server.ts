import express from "express";
import cors from "cors";
import { router } from "./routes.js";
import { apiLimiter } from "./middleware/RateLimiter.js";
import { errorHandler } from "./middleware/ErrorHandler.js";
import logger from "./services/Logger.js";
import dotenv from "dotenv";

dotenv.config();

const server = express();

const corsOptions = {

    origin:
        process.env.FRONTEND_URL ||
        "https://api-loansystem.onrender.com",

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

server.use("/api", apiLimiter);

server.use(router);

server.use(errorHandler);

export { server };