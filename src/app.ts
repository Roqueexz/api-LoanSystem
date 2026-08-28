import "./config/env.js";
import { server } from "./server.js";
import { DatabaseModel } from "./model/DatabaseModel.js";
import logger from "./services/Logger.js";

const port = Number(process.env.PORT) || 3333;
const NODE_ENV = process.env.NODE_ENV || "development";

async function iniciarServidor() {

    try {

        const db = new DatabaseModel();

        const conexaoOk = await db.testeConexao();

        if (!conexaoOk) {

            logger.error("Nao foi possivel conectar ao banco de dados");

            console.error(
                "Nao foi possivel conectar ao banco de dados"
            );

            process.exit(1);
        }

        server.listen(port, "0.0.0.0", () => {

            logger.info(
                {
                    port,
                    db: process.env.DB_NAME,
                    env: NODE_ENV,
                    frontendUrl: process.env.FRONTEND_URL || "(fallback localhost)"
                },
                "Servidor iniciado com sucesso"
            );

            console.log(
                `Servidor rodando na porta ${port} [${NODE_ENV}]`
            );

            console.log(
                `Banco: ${process.env.DB_NAME} @ ${process.env.DB_HOST}:${process.env.DB_PORT}`
            );

            const corsLog = process.env.FRONTEND_URL || (NODE_ENV === "production" ? "https://interface-loansystem.vercel.app" : "http://localhost:5173 (dev)");
            console.log(`CORS permitido: ${corsLog}`);
        });

    } catch (err) {

        logger.error(
            { error: err },
            "Erro ao iniciar servidor"
        );

        console.error(
            "Erro ao iniciar servidor:",
            err
        );

        process.exit(1);
    }
}

iniciarServidor();