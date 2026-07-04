import { server } from "./server.js";
import { DatabaseModel } from "./model/DatabaseModel.js";
import dotenv from "dotenv";

dotenv.config();

const port = process.env.PORT || 3333;

new DatabaseModel()
  .testeConexao()
  .then((resbd) => {
    if (resbd) {
      server.listen(port, () => {
        console.log(`✅ Servidor rodando em http://localhost:${port}`);
        console.log(`📊 Banco: ${process.env.DB_NAME}`);
        console.log(`🔒 CORS permitido: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
      });
    } else {
      console.log("❌ Nao foi possivel conectar ao banco de dados");
    }
  })
  .catch((err: unknown) => {
    console.error("❌ Erro ao testar conexao com o banco de dados:", err);
  });