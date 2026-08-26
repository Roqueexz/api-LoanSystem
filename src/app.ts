import { server } from "./server.js";
import { DatabaseModel } from "./model/DatabaseModel.js";
import logger from "./services/Logger.js";
import dotenv from "dotenv";

dotenv.config();

const port = Number(process.env.PORT) || 3333;

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
                    db: process.env.DB_NAME
                },
                "Servidor iniciado com sucesso"
            );

            console.log(
                `Servidor rodando na porta ${port}`
            );

            console.log(
                `Banco: ${process.env.DB_NAME}`
            );

            console.log(
                `CORS permitido: ${
                    process.env.FRONTEND_URL ||
                    "http://localhost:5173"
                }`
            );
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