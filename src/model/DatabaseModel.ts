import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

export class DatabaseModel {

    private _config: pg.PoolConfig;
    private _pool: pg.Pool;

    constructor() {

        this._config = {
            user: process.env.DB_USER,
            host: process.env.DB_HOST,
            database: process.env.DB_NAME,
            password: process.env.DB_PASSWORD,
            port: process.env.DB_PORT
                ? Number(process.env.DB_PORT)
                : 5432,

            max: 10,
            idleTimeoutMillis: 10000,

            // Necessário para conexões PostgreSQL hospedadas,
            // como o PostgreSQL do Render.
            ssl: process.env.NODE_ENV === "production"
                ? { rejectUnauthorized: false }
                : false,
        };

        this._pool = new pg.Pool(this._config);
    }

    /**
     * Testa a conexão com o banco de dados.
     */
    public async testeConexao(): Promise<boolean> {

        try {

            const clientTemp = await this._pool.connect();

            console.log("Database connected successfully! 🚀");

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

// Exporta uma única instância do banco para o projeto.
const databaseInstance = new DatabaseModel();

export default databaseInstance;