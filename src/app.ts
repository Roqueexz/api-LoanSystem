import { server } from "./server.js";
import { DatabaseModel } from "./model/DatabaseModel.js";
import logger from "./services/Logger.js";
import dotenv from "dotenv";

dotenv.config();

const port = process.env.PORT || 3333;

new DatabaseModel()
  .testeConexao()
  .then((resbd) => {
    if (resbd) {
      server.listen(port, () => {
        logger.info({ port, db: process.env.DB_NAME }, 'Servidor iniciado com sucesso');
        logger.info(`🔒 CORS permitido: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
      });
    } else {
      logger.error('Nao foi possivel conectar ao banco de dados');
    }
  })
  .catch((err: unknown) => {
    logger.error({ error: err }, 'Erro ao testar conexao com o banco de dados');
  });