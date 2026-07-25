import { type Request, type Response } from 'express';
import CaixaPessoal from '../model/CaixaPessoal.js';
import logger from '../services/Logger.js';

// Cédulas permitidas — validação no controller também (defesa em profundidade)
const CEDULAS_VALIDAS = [2, 5, 10, 20, 50, 100, 200];

export default class CaixaPessoalController {

    // ─── GET /api/caixa-pessoal/cofre ──────────────────────────────────
    // Retorna o cofre completo do usuário autenticado.
    // O id_usuario vem SEMPRE do token JWT — nunca de query/body.
    static async obterCofre(req: Request, res: Response): Promise<any> {
        try {
            const { id } = (req as any).usuario;

            const cofre = await CaixaPessoal.obterCofre(Number(id));

            return res.status(200).json(cofre);

        } catch (error) {
            logger.error({ error }, '[CaixaPessoalController] Erro ao obter cofre');
            return res.status(500).json({
                mensagem: 'Erro interno ao recuperar o cofre.'
            });
        }
    }

    // ─── PATCH /api/caixa-pessoal/cofre/:valor_cedula ──────────────────
    // Atualiza a quantidade de uma cédula específica.
    // Segurança:
    //   - id_usuario vem do token JWT
    //   - valor_cedula é validado contra lista de cédulas permitidas
    //   - quantidade é validada como inteiro não-negativo
    static async atualizarCedula(req: Request, res: Response): Promise<any> {
        try {
            const { id } = (req as any).usuario;
            const valor_cedula = Number(req.params.valor_cedula);
            const { quantidade } = req.body;

            // Validar cédula
            if (!CEDULAS_VALIDAS.includes(valor_cedula)) {
                return res.status(400).json({
                    mensagem: `Cédula inválida. Valores permitidos: ${CEDULAS_VALIDAS.join(', ')}.`
                });
            }

            // Validar quantidade
            if (quantidade === undefined || quantidade === null) {
                return res.status(400).json({
                    mensagem: 'Campo "quantidade" é obrigatório.'
                });
            }

            const qtd = Number(quantidade);

            if (!Number.isInteger(qtd) || qtd < 0) {
                return res.status(400).json({
                    mensagem: 'Quantidade deve ser um número inteiro não-negativo.'
                });
            }

            const cedula = await CaixaPessoal.atualizarCedula(
                Number(id),
                valor_cedula,
                qtd
            );

            return res.status(200).json(cedula);

        } catch (error) {
            logger.error({ error }, '[CaixaPessoalController] Erro ao atualizar cédula');
            return res.status(500).json({
                mensagem: 'Erro interno ao atualizar a cédula.'
            });
        }
    }
}