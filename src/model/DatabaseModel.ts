import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

export class DatabaseModel {
  private _config: pg.PoolConfig; // Tipagem explícita do driver pg
  private _pool: pg.Pool;

  constructor() {
    this._config = {
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
      max: 10,
      idleTimeoutMillis: 10000, // CORRIGIDO: Escrita correta de Timeout
    };

    this._pool = new pg.Pool(this._config);
  }

  /**
   * Método seguro para testar a conexão usando o próprio Pool
   */
  public async testeConexao(): Promise<boolean> {
    try {
      // Pega uma conexão temporária do pool
      const clientTemp = await this._pool.connect();
      console.log("Database connected successfully! 🚀");
      
      // Libera o cliente de volta para o pool (não encerra o pool)
      clientTemp.release();
      return true;
    } catch (error) {
      console.error("Error connecting to database ❌");
      console.error(error);
      return false;
    }
  }

  public get pool(): pg.Pool {
    return this._pool;
  }
}

// Exporta uma única instância para o projeto inteiro (Padrão Singleton)
const databaseInstance = new DatabaseModel();
export default databaseInstance;