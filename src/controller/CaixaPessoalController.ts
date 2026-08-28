// api/src/controller/CaixaPessoalController.ts
import { type Request, type Response } from 'express';
import CaixaPessoal from '../model/CaixaPessoal.js';
import logger from '../services/Logger.js';
import { analisarConciliacao, listarConciliacoes } from '../services/ConciliacaoService.js';
import fs from 'fs';
import path from 'path';

const CEDULAS_VALIDAS = [2, 5, 10, 20, 50, 100, 200];

export default class CaixaPessoalController {

    // ─── GET /api/caixa-pessoal/cofre ──────────────────────────────────
    static async obterCofre(req: Request, res: Response): Promise<any> {
        try {
            const { id } = (req as any).usuario;
            if (!id || isNaN(Number(id))) {
                logger.warn({ id }, '[CaixaPessoalController] obterCofre sem id válido no token');
                return res.status(401).json({ mensagem: 'Sessão inválida. Faça login novamente.' });
            }
            const cofre = await CaixaPessoal.obterCofre(Number(id));
            return res.status(200).json(cofre);
        } catch (error: any) {
            logger.error({ error: error?.message || error, stack: error?.stack }, '[CaixaPessoalController] Erro ao obter cofre');
            // Expõe a mensagem apenas em desenvolvimento para facilitar o debug do Supabase/SSL
            const detalhe = process.env.NODE_ENV !== 'production' && error?.message ? ` (${error.message})` : '';
            return res.status(500).json({
                mensagem: 'Erro interno ao recuperar o cofre.' + detalhe
            });
        }
    }

    // ─── GET /api/caixa-pessoal/saldo ──────────────────────────────────
    static async obterSaldo(req: Request, res: Response): Promise<any> {
        try {
            const { id } = (req as any).usuario;
            const saldo = await CaixaPessoal.obterSaldo(Number(id));
            return res.status(200).json({ saldo });
        } catch (error) {
            logger.error({ error }, '[CaixaPessoalController] Erro ao obter saldo');
            return res.status(500).json({
                mensagem: 'Erro interno ao obter saldo.'
            });
        }
    }

    // ─── PUT /api/caixa-pessoal/saldo ──────────────────────────────────
    static async atualizarSaldo(req: Request, res: Response): Promise<any> {
        try {
            const { id } = (req as any).usuario;
            const { saldo } = req.body;

            if (saldo === undefined || typeof saldo !== 'number' || isNaN(saldo)) {
                return res.status(400).json({
                    mensagem: 'Campo "saldo" é obrigatório e deve ser um número válido.'
                });
            }

            const sucesso = await CaixaPessoal.atualizarSaldo(Number(id), saldo);
            if (!sucesso) {
                return res.status(500).json({
                    mensagem: 'Falha ao atualizar o saldo do cofre pessoal.'
                });
            }

            return res.status(200).json({
                mensagem: 'Saldo atualizado com sucesso.',
                saldo
            });
        } catch (error) {
            logger.error({ error }, '[CaixaPessoalController] Erro ao atualizar saldo');
            return res.status(500).json({
                mensagem: 'Erro interno ao atualizar saldo.'
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
            const { status, categoria, recorrencia, prioridade, q, dias } = req.query;

            const filtros: {
                status?: string;
                categoria?: string;
                recorrencia?: string;
                prioridade?: string;
                q?: string;
                dias?: number;
            } = {};

            if (typeof status === 'string') filtros.status = status;
            if (typeof categoria === 'string') filtros.categoria = categoria;
            if (typeof recorrencia === 'string') filtros.recorrencia = recorrencia;
            if (typeof prioridade === 'string') filtros.prioridade = prioridade;
            if (typeof q === 'string') filtros.q = q;
            if (typeof dias === 'string' && !isNaN(Number(dias))) filtros.dias = Number(dias);

            const contas = await CaixaPessoal.listarContas(Number(id), filtros);
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
            const { tipo, descricao, valor, vencimento, categoria, recorrencia, prioridade, lembrete_dias_antes, observacao, tags, status } = req.body;

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
            const RECORRENCIA_VALIDA = ['unica', 'diaria', 'semanal', 'quinzenal', 'mensal', 'bimestral', 'trimestral', 'semestral', 'anual'] as const;
            const PRIORIDADE_VALIDA = ['alta', 'media', 'baixa'] as const;
            const STATUS_VALIDO = ['programada', 'pendente', 'paga', 'atrasada', 'cancelada'] as const;

            const recorrenciaValor = typeof recorrencia === 'string' && RECORRENCIA_VALIDA.includes(recorrencia as any) ? recorrencia as typeof RECORRENCIA_VALIDA[number] : undefined;
            const prioridadeValor = typeof prioridade === 'string' && PRIORIDADE_VALIDA.includes(prioridade as any) ? prioridade as typeof PRIORIDADE_VALIDA[number] : undefined;
            const statusValor = typeof status === 'string' && STATUS_VALIDO.includes(status as any) ? status as typeof STATUS_VALIDO[number] : undefined;

            const payload = {
                tipo,
                descricao: descricao.trim(),
                valor: valorNum,
                vencimento: String(vencimento),
                categoria: typeof categoria === 'string' ? categoria.trim() : undefined,
                recorrencia: recorrenciaValor,
                prioridade: prioridadeValor,
                lembrete_dias_antes: lembrete_dias_antes !== undefined ? Number(lembrete_dias_antes) : undefined,
                observacao: typeof observacao === 'string' ? observacao.trim() : undefined,
                tags: Array.isArray(tags) ? tags.filter((tag) => typeof tag === 'string' && tag.trim().length > 0).map((tag) => tag.trim()) : undefined,
                status: statusValor,
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

    // ─── GET /api/caixa-pessoal/metas ───────────────────────────────────
    static async listarMetas(req: Request, res: Response): Promise<any> {
        try {
            const { id } = (req as any).usuario;
            const metas = await CaixaPessoal.listarMetas(Number(id));
            return res.status(200).json(metas);
        } catch (error) {
            logger.error({ error }, '[CaixaPessoalController] Erro ao listar metas');
            return res.status(500).json({ mensagem: 'Erro interno ao listar metas.' });
        }
    }

    // ─── POST /api/caixa-pessoal/metas ──────────────────────────────────
    static async criarMeta(req: Request, res: Response): Promise<any> {
        try {
            const { id } = (req as any).usuario;
            const nome = req.body.nome;
            const descricao = req.body.descricao;
            const valor_alvo = Number(req.body.valor_alvo ?? req.body.valorAlvo);
            const valor_atual = req.body.valor_atual !== undefined
                ? Number(req.body.valor_atual)
                : (req.body.valorAtual !== undefined ? Number(req.body.valorAtual) : 0);
            const prazo = req.body.prazo;

            const meta = await CaixaPessoal.criarMeta(Number(id), {
                nome,
                descricao,
                valor_alvo,
                valor_atual,
                prazo,
            });
            return res.status(201).json(meta);
        } catch (error) {
            logger.error({ error }, '[CaixaPessoalController] Erro ao criar meta');
            return res.status(500).json({ mensagem: 'Erro interno ao criar meta.' });
        }
    }

    // ─── PUT /api/caixa-pessoal/metas/:id ───────────────────────────────
    static async atualizarMeta(req: Request, res: Response): Promise<any> {
        try {
            const { id } = (req as any).usuario;
            const id_meta = Number(req.params.id);

            if (isNaN(id_meta) || id_meta <= 0) {
                return res.status(400).json({ mensagem: 'ID da meta inválido.' });
            }

            const nome = req.body.nome;
            const descricao = req.body.descricao;
            const valor_alvo = req.body.valor_alvo !== undefined
                ? Number(req.body.valor_alvo)
                : (req.body.valorAlvo !== undefined ? Number(req.body.valorAlvo) : undefined);
            const valor_atual = req.body.valor_atual !== undefined
                ? Number(req.body.valor_atual)
                : (req.body.valorAtual !== undefined ? Number(req.body.valorAtual) : undefined);
            const prazo = req.body.prazo;

            const payload: any = {};
            if (nome !== undefined) payload.nome = String(nome);
            if (descricao !== undefined) payload.descricao = String(descricao);
            if (valor_alvo !== undefined) payload.valor_alvo = valor_alvo;
            if (valor_atual !== undefined) payload.valor_atual = valor_atual;
            if (prazo !== undefined) payload.prazo = String(prazo);

            const meta = await CaixaPessoal.atualizarMeta(Number(id), id_meta, payload);

            if (!meta) {
                return res.status(404).json({ mensagem: 'Meta não encontrada ou não pertence ao usuário.' });
            }

            return res.status(200).json(meta);
        } catch (error) {
            logger.error({ error }, '[CaixaPessoalController] Erro ao atualizar meta');
            return res.status(500).json({ mensagem: 'Erro interno ao atualizar meta.' });
        }
    }

    // ─── DELETE /api/caixa-pessoal/metas/:id ─────────────────────────────
    static async removerMeta(req: Request, res: Response): Promise<any> {
        try {
            const { id } = (req as any).usuario;
            const id_meta = Number(req.params.id);

            if (isNaN(id_meta) || id_meta <= 0) {
                return res.status(400).json({ mensagem: 'ID da meta inválido.' });
            }

            const deletado = await CaixaPessoal.removerMeta(Number(id), id_meta);
            if (!deletado) {
                return res.status(404).json({ mensagem: 'Meta não encontrada ou não pertence ao usuário.' });
            }

            return res.status(200).json({ mensagem: 'Meta removida com sucesso.' });
        } catch (error) {
            logger.error({ error }, '[CaixaPessoalController] Erro ao remover meta');
            return res.status(500).json({ mensagem: 'Erro interno ao remover meta.' });
        }
    }

    // ─── POST /api/caixa-pessoal/cofre/conciliacao (foto OCR vs manual) ─
    static async conciliarCofre(req: Request, res: Response): Promise<any> {
        try {
            const { id } = (req as any).usuario;
            if (!id || isNaN(Number(id))) return res.status(401).json({ mensagem: 'Sessão inválida.' });

            // Manual vem como JSON string no multipart (campo 'manual')
            let manualCedulas: { valor_cedula: number; quantidade: number }[] = [];
            if (req.body.manual) {
                try { manualCedulas = JSON.parse(req.body.manual); } catch { manualCedulas = []; }
            }
            // Fallback: se não enviou manual, usa o cofre atual
            if (manualCedulas.length === 0) {
                const cofre = await CaixaPessoal.obterCofre(Number(id));
                manualCedulas = cofre.cedulas;
            }

            // OCR do cliente (opcional) — campo 'ocr' como JSON
            let ocrClient: any = undefined;
            if (req.body.ocr) {
                try { ocrClient = JSON.parse(req.body.ocr); } catch { ocrClient = undefined; }
            }

            const file = (req as any).file as Express.Multer.File | undefined;
            let fotoUrl: string | null = null;
            let fotoBuffer: Buffer | null = null;

            if (file) {
                fotoBuffer = await fs.promises.readFile(file.path);
                // Processa com sharp para webp (reaproveita helper existente)
                try {
                    const sharp = (await import('sharp')).default;
                    const outPath = file.path.replace(/\.[^.]+$/, '.webp');
                    await sharp(file.path).rotate().resize({ width: 1280, height: 1280, fit: 'inside' }).toFormat('webp', { quality: 80 }).toFile(outPath);
                    await fs.promises.unlink(file.path).catch(() => {});
                    fotoUrl = `/uploads/${path.basename(outPath)}`;
                } catch {
                    fotoUrl = `/uploads/${path.basename(file.path)}`;
                }
            }

            const resultado = await analisarConciliacao(Number(id), manualCedulas, fotoUrl, fotoBuffer, ocrClient);
            return res.status(200).json(resultado);
        } catch (error: any) {
            logger.error({ error: error?.message || error }, '[CaixaPessoalController] Erro na conciliação OCR');
            return res.status(500).json({ mensagem: 'Erro interno na conciliação.', detalhe: error?.message });
        }
    }

    // ─── GET /api/caixa-pessoal/cofre/conciliacoes ─────────────────────
    static async listarConciliacoes(req: Request, res: Response): Promise<any> {
        try {
            const { id } = (req as any).usuario;
            const lista = await listarConciliacoes(Number(id), 20);
            return res.status(200).json(lista);
        } catch (error) {
            logger.error({ error }, '[CaixaPessoalController] Erro ao listar conciliações');
            return res.status(500).json({ mensagem: 'Erro interno ao listar conciliações.' });
        }
    }
}
