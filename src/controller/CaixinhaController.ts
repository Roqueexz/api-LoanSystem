import type { Request, Response } from 'express';
import { Caixinha } from '../model/Caixinha.js';
import CaixaPessoal from '../model/CaixaPessoal.js';
import logger from '../services/Logger.js';

export default class CaixinhaController {
  static async listar(req: Request, res: Response): Promise<any> {
    try {
      const { id } = (req as any).usuario;
      const caixinhas = await Caixinha.listar(Number(id));
      return res.status(200).json(caixinhas);
    } catch (error) {
      logger.error({ error }, '[CaixinhaController] Erro ao listar caixinhas');
      return res.status(500).json({ mensagem: 'Erro ao recuperar caixinhas.' });
    }
  }

  static async criar(req: Request, res: Response): Promise<any> {
    try {
      const { id } = (req as any).usuario;
      const novaCaixinha = await Caixinha.criar(Number(id), req.body);
      return res.status(201).json(novaCaixinha);
    } catch (error: any) {
      logger.error({ error }, '[CaixinhaController] Erro ao criar caixinha');
      if (error?.code === '23505') {
        return res.status(400).json({ mensagem: 'Já existe uma caixinha com este nome.' });
      }
      return res.status(500).json({ mensagem: 'Erro ao criar caixinha.' });
    }
  }

  static async depositar(req: Request, res: Response): Promise<any> {
    try {
      const { id } = (req as any).usuario;
      const id_caixinha = Number(req.params.id);
      const { valor } = req.body;

      if (!valor || valor <= 0) {
        return res.status(400).json({ mensagem: 'Valor de depósito deve ser maior que zero.' });
      }

      const valorNumerico = Number(valor);

      // Verificar saldo disponível no caixa pessoal
      const saldoAtual = await CaixaPessoal.obterSaldo(Number(id));
      if (saldoAtual < valorNumerico) {
        const saldoFormatado = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(saldoAtual);
        return res.status(400).json({
          mensagem: `Saldo insuficiente. Seu saldo atual é ${saldoFormatado}.`,
        });
      }

      const atualizada = await Caixinha.depositar(id_caixinha, Number(id), valorNumerico);
      if (!atualizada) {
        return res.status(404).json({ mensagem: 'Caixinha não encontrada.' });
      }

      // Registrar movimentação de saída no caixa pessoal
      await CaixaPessoal.criarMovimentacao(Number(id), {
        tipo: 'saida',
        valor: valorNumerico,
        categoria: 'Caixinha',
        descricao: `Depósito na caixinha: ${atualizada.nome}`,
        data: new Date().toISOString().slice(0, 10),
      });

      return res.status(200).json(atualizada);
    } catch (error) {
      logger.error({ error }, '[CaixinhaController] Erro ao depositar em caixinha');
      return res.status(500).json({ mensagem: 'Erro ao realizar depósito na caixinha.' });
    }
  }

  static async resgatar(req: Request, res: Response): Promise<any> {
    try {
      const { id } = (req as any).usuario;
      const id_caixinha = Number(req.params.id);
      const { valor } = req.body;

      if (!valor || valor <= 0) {
        return res.status(400).json({ mensagem: 'Valor de resgate deve ser maior que zero.' });
      }

      const valorNumerico = Number(valor);

      const caixinhaExistente = await Caixinha.obterPorId(id_caixinha, Number(id));
      if (!caixinhaExistente) {
        return res.status(404).json({ mensagem: 'Caixinha não encontrada.' });
      }

      if (caixinhaExistente.saldo < valorNumerico) {
        const saldoCaixinhaFormatado = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(caixinhaExistente.saldo);
        return res.status(400).json({
          mensagem: `Saldo insuficiente na caixinha. Disponível: ${saldoCaixinhaFormatado}.`,
        });
      }

      const atualizada = await Caixinha.resgatar(id_caixinha, Number(id), valorNumerico);
      if (!atualizada) {
        return res.status(404).json({ mensagem: 'Caixinha não encontrada.' });
      }

      // Registrar movimentação de entrada no caixa pessoal
      await CaixaPessoal.criarMovimentacao(Number(id), {
        tipo: 'entrada',
        valor: valorNumerico,
        categoria: 'Caixinha',
        descricao: `Resgate da caixinha: ${atualizada.nome}`,
        data: new Date().toISOString().slice(0, 10),
      });

      return res.status(200).json(atualizada);
    } catch (error) {
      logger.error({ error }, '[CaixinhaController] Erro ao resgatar de caixinha');
      return res.status(500).json({ mensagem: 'Erro ao realizar resgate da caixinha.' });
    }
  }

  static async remover(req: Request, res: Response): Promise<any> {
    try {
      const { id } = (req as any).usuario;
      const id_caixinha = Number(req.params.id);

      const removido = await Caixinha.remover(id_caixinha, Number(id));
      if (!removido) {
        return res.status(404).json({ mensagem: 'Caixinha não encontrada.' });
      }

      return res.status(200).json({ mensagem: 'Caixinha removida com sucesso.' });
    } catch (error) {
      logger.error({ error }, '[CaixinhaController] Erro ao remover caixinha');
      return res.status(500).json({ mensagem: 'Erro ao remover caixinha.' });
    }
  }
}
