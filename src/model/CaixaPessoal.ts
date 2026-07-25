import type { CofreFisicoDTO, CedulaCofreDTO } from '../interface/CaixaPessoalDTO.js';
import databaseInstance from './DatabaseModel.js';
import logger from '../services/Logger.js';

const database = databaseInstance.pool;

// Cédulas válidas — imutável, definido uma vez
const CEDULAS_VALIDAS = [200, 100, 50, 20, 10, 5, 2];

export default class CaixaPessoal {

    // ─── COFRE: OBTER ──────────────────────────────────────────────────
    // Retorna todas as cédulas do usuário, ordenadas da maior para menor.
    // Cédulas sem registro no banco são retornadas com quantidade 0,
    // garantindo que o frontend sempre receba as 7 cédulas.
    static async obterCofre(id_usuario: number): Promise<CofreFisicoDTO> {
        try {
            const query = `
                SELECT valor_cedula, quantidade
                FROM caixa_pessoal_cofre
                WHERE id_usuario = $1
                ORDER BY valor_cedula DESC
            `;
            const resultado = await database.query(query, [id_usuario]);

            // Mapeia os registros existentes
            const registros = new Map<number, number>(
                resultado.rows.map((r: any) => [Number(r.valor_cedula), Number(r.quantidade)])
            );

            // Garante que todas as 7 cédulas aparecem, mesmo sem registro
            const cedulas: CedulaCofreDTO[] = CEDULAS_VALIDAS.map((valor) => ({
                valor_cedula: valor,
                quantidade: registros.get(valor) ?? 0,
            }));

            const total = cedulas.reduce(
                (acc, c) => acc + c.valor_cedula * c.quantidade,
                0
            );

            logger.info({ id_usuario, total }, '[CaixaPessoal] Cofre obtido');

            return { cedulas, total };

        } catch (error) {
            logger.error({ error, id_usuario }, '[CaixaPessoal] Erro ao obter cofre');
            throw error;
        }
    }

    // ─── COFRE: ATUALIZAR CÉDULA ───────────────────────────────────────
    // UPSERT: insere se não existir, atualiza se já existir.
    // Segurança: valida que a cédula é um valor permitido.
    // Segurança: valida que a quantidade não é negativa.
    // Segurança: id_usuario vem sempre do token JWT, nunca do body.
    static async atualizarCedula(
        id_usuario: number,
        valor_cedula: number,
        quantidade: number
    ): Promise<CedulaCofreDTO> {
        // Validação de cédula válida — camada de segurança extra no model
        if (!CEDULAS_VALIDAS.includes(valor_cedula)) {
            throw new Error(`Cédula inválida: ${valor_cedula}`);
        }

        if (quantidade < 0) {
            throw new Error('Quantidade não pode ser negativa');
        }

        try {
            const query = `
                INSERT INTO caixa_pessoal_cofre (id_usuario, valor_cedula, quantidade, atualizado_em)
                VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
                ON CONFLICT (id_usuario, valor_cedula)
                DO UPDATE SET
                    quantidade = EXCLUDED.quantidade,
                    atualizado_em = CURRENT_TIMESTAMP
                RETURNING valor_cedula, quantidade
            `;
            const resultado = await database.query(query, [
                id_usuario,
                valor_cedula,
                quantidade,
            ]);

            const cedula = resultado.rows[0];

            logger.info(
                { id_usuario, valor_cedula, quantidade },
                '[CaixaPessoal] Cédula atualizada'
            );

            return {
                valor_cedula: Number(cedula.valor_cedula),
                quantidade: Number(cedula.quantidade),
            };

        } catch (error) {
            logger.error(
                { error, id_usuario, valor_cedula, quantidade },
                '[CaixaPessoal] Erro ao atualizar cédula'
            );
            throw error;
        }
    }
}