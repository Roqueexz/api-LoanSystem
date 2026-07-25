// api/src/controller/CaixaPessoalController.ts
import { type Request, type Response } from 'express';
import CaixaPessoal from '../model/CaixaPessoal.js';
import logger from '../services/Logger.js';

const CEDULAS_VALIDAS = [2, 5, 10, 20, 50, 100, 200];

export default class CaixaPessoalController {

    // ─── GET /api/caixa-pessoal/cofre ──────────────────────────────────
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
    static async atualizarCedula(req: Request, res: Response): Promise<any> {
        try {
            const { id } = (req as any).usuario;
            const valor_cedula = Number(req.params.valor_cedula);
            const { quantidade } = req.body;

            if (!CEDULAS_VALIDAS.includes(valor_cedula)) {
                return res.status(400).json({
                    mensagem: `Cédula inválida. Valores permitidos: ${CEDULAS_VALIDAS.join(', ')}.`
                });
            }

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

    // ─── GET /api/caixa-pessoal/movimentacoes ──────────────────────────
    static async listarMovimentacoes(req: Request, res: Response): Promise<any> {
        try {
            const { id } = (req as any).usuario;
            const { tipo, categoria } = req.query;

            const filtros: { tipo?: string; categoria?: string } = {};
            if (typeof tipo === 'string') filtros.tipo = tipo;
            if (typeof categoria === 'string') filtros.categoria = categoria;

            const movimentacoes = await CaixaPessoal.listarMovimentacoes(Number(id), filtros);

            return res.status(200).json(movimentacoes);
        } catch (error) {
            logger.error({ error }, '[CaixaPessoalController] Erro ao listar movimentações');
            return res.status(500).json({
                mensagem: 'Erro interno ao listar movimentações.'
            });
        }
    }

    // ─── POST /api/caixa-pessoal/movimentacoes ─────────────────────────
    static async criarMovimentacao(req: Request, res: Response): Promise<any> {
        try {
            const { id } = (req as any).usuario;
            const { tipo, valor, categoria, descricao, data } = req.body;

            if (!tipo || !['entrada', 'saida'].includes(tipo)) {
                return res.status(400).json({
                    mensagem: 'Campo "tipo" deve ser "entrada" ou "saida".'
                });
            }

            const valorNum = Number(valor);
            if (isNaN(valorNum) || valorNum <= 0) {
                return res.status(400).json({
                    mensagem: 'Campo "valor" deve ser um número positivo.'
                });
            }

            if (!categoria || typeof categoria !== 'string' || categoria.trim() === '') {
                return res.status(400).json({
                    mensagem: 'Campo "categoria" é obrigatório.'
                });
            }

            const payload = {
                tipo,
                valor: valorNum,
                categoria: categoria.trim(),
                ...(descricao !== undefined && descricao !== null ? { descricao: String(descricao).trim() } : {}),
                data: String(data ?? new Date().toISOString().split('T')[0]),
            };
            const novaMovimentacao = await CaixaPessoal.criarMovimentacao(Number(id), payload);

            return res.status(201).json(novaMovimentacao);
        } catch (error) {
            logger.error({ error }, '[CaixaPessoalController] Erro ao criar movimentação');
            return res.status(500).json({
                mensagem: 'Erro interno ao registrar movimentação.'
            });
        }
    }

    // ─── DELETE /api/caixa-pessoal/movimentacoes/:id ───────────────────
    static async removerMovimentacao(req: Request, res: Response): Promise<any> {
        try {
            const { id } = (req as any).usuario;
            const id_movimentacao = Number(req.params.id);

            if (isNaN(id_movimentacao) || id_movimentacao <= 0) {
                return res.status(400).json({
                    mensagem: 'ID da movimentação inválido.'
                });
            }

            const deletado = await CaixaPessoal.removerMovimentacao(Number(id), id_movimentacao);

            if (!deletado) {
                return res.status(404).json({
                    mensagem: 'Movimentação não encontrada ou não pertence ao usuário.'
                });
            }

            return res.status(200).json({
                mensagem: 'Movimentação removida com sucesso.'
            });
        } catch (error) {
            logger.error({ error }, '[CaixaPessoalController] Erro ao remover movimentação');
            return res.status(500).json({
                mensagem: 'Erro interno ao remover movimentação.'
            });
        }
    }

    // ─── GET /api/caixa-pessoal/contas ─────────────────────────────────
    static async listarContas(req: Request, res: Response): Promise<any> {
        try {
            const { id } = (req as any).usuario;
            const contas = await CaixaPessoal.listarContas(Number(id));
            return res.status(200).json(contas);
        } catch (error) {
            logger.error({ error }, '[CaixaPessoalController] Erro ao listar contas');
            return res.status(500).json({ mensagem: 'Erro interno ao listar contas.' });
        }
    }

    // ─── POST /api/caixa-pessoal/contas ────────────────────────────────
    static async criarConta(req: Request, res: Response): Promise<any> {
        try {
            const { id } = (req as any).usuario;
            const { tipo, descricao, valor, vencimento } = req.body;

            if (!tipo || !['pagar', 'receber'].includes(tipo)) {
                return res.status(400).json({ mensagem: 'Campo "tipo" deve ser "pagar" ou "receber".' });
            }

            if (!descricao || typeof descricao !== 'string' || descricao.trim() === '') {
                return res.status(400).json({ mensagem: 'Campo "descricao" é obrigatório.' });
            }

            const valorNum = Number(valor);
            if (isNaN(valorNum) || valorNum <= 0) {
                return res.status(400).json({ mensagem: 'Campo "valor" deve ser um número positivo.' });
            }

            // vencimento no formato YYYY-MM-DD (ou omitido será validado no model)
            const payload = {
                tipo,
                descricao: descricao.trim(),
                valor: valorNum,
                vencimento: String(vencimento),
            };

            const novaConta = await CaixaPessoal.criarConta(Number(id), payload);
            return res.status(201).json(novaConta);
        } catch (error) {
            logger.error({ error }, '[CaixaPessoalController] Erro ao criar conta');
            return res.status(500).json({ mensagem: 'Erro interno ao criar conta.' });
        }
    }

    // ─── PATCH /api/caixa-pessoal/contas/:id/pagar ─────────────────────
    static async pagarConta(req: Request, res: Response): Promise<any> {
        try {
            const { id } = (req as any).usuario;
            const id_conta = Number(req.params.id);

            if (isNaN(id_conta) || id_conta <= 0) {
                return res.status(400).json({ mensagem: 'ID da conta inválido.' });
            }

            const atualizado = await CaixaPessoal.pagarConta(Number(id), id_conta);
            if (!atualizado) {
                return res.status(404).json({ mensagem: 'Conta não encontrada ou não pertence ao usuário.' });
            }

            return res.status(200).json({ mensagem: 'Conta marcada como paga.' });
        } catch (error) {
            logger.error({ error }, '[CaixaPessoalController] Erro ao marcar conta como paga');
            return res.status(500).json({ mensagem: 'Erro interno ao pagar conta.' });
        }
    }

    // ─── DELETE /api/caixa-pessoal/contas/:id ──────────────────────────
    static async removerConta(req: Request, res: Response): Promise<any> {
        try {
            const { id } = (req as any).usuario;
            const id_conta = Number(req.params.id);

            if (isNaN(id_conta) || id_conta <= 0) {
                return res.status(400).json({ mensagem: 'ID da conta inválido.' });
            }

            const deletado = await CaixaPessoal.removerConta(Number(id), id_conta);
            if (!deletado) {
                return res.status(404).json({ mensagem: 'Conta não encontrada ou não pertence ao usuário.' });
            }

            return res.status(200).json({ mensagem: 'Conta removida com sucesso.' });
        } catch (error) {
            logger.error({ error }, '[CaixaPessoalController] Erro ao remover conta');
            return res.status(500).json({ mensagem: 'Erro interno ao remover conta.' });
        }
    }
}
