import dotenv from "dotenv";
import path from "path";
import fs from "fs";

// Carrega variáveis de ambiente por ambiente
// - NODE_ENV=production -> .env.production
// - NODE_ENV=development (ou undefined) -> .env.development -> fallback .env
// Isso permite ter 2 arquivos distintos sem precisar trocar manualmente.

const NODE_ENV = process.env.NODE_ENV || "development";
const envFiles = [
  `.env.${NODE_ENV}`, // ex: .env.development ou .env.production
  ".env", // fallback (compatibilidade local)
];

for (const file of envFiles) {
  const fullPath = path.resolve(process.cwd(), file);
  if (fs.existsSync(fullPath)) {
    dotenv.config({ path: fullPath, override: false });
    // não dá override para permitir que o primeiro arquivo tenha prioridade
    // mas continuamos carregando o fallback para completar chaves faltantes
  }
}

// Validação mínima — evita rodar com DB sem host
if (!process.env.DB_HOST) {
  console.warn(`[env] AVISO: DB_HOST não definido. Verifique .env.${NODE_ENV} ou .env`);
}

export const ENV = {
  NODE_ENV,
  PORT: Number(process.env.PORT) || 3333,
  DB_HOST: process.env.DB_HOST || "localhost",
  DB_PORT: process.env.DB_PORT || (NODE_ENV === "production" ? "6543" : "5432"),
  DB_NAME: process.env.DB_NAME || "LoanSystem",
  DB_USER: process.env.DB_USER || "postgres",
  DB_PASSWORD: process.env.DB_PASSWORD || "admin",
  JWT_SECRET: process.env.JWT_SECRET || "sistemaLoan1984",
  // FRONTEND_URL pode ser lista separada por vírgula (CORS multi-origem)
  FRONTEND_URL: process.env.FRONTEND_URL || "",
};

export default ENV;
