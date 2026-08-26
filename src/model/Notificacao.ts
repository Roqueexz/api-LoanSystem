import logger from '../services/Logger.js';
import type { NotificacaoDTO, PreferenciaNotificacaoDTO } from '../interface/NotificacaoDTO.js';
import { DatabaseModel } from "./DatabaseModel.js";

const database = new DatabaseModel().pool;

export default class Notificacao {
  static async listar(idUsuario: number): Promise<{ notificacoes: NotificacaoDTO[]; resumo: { total: number; naoLidas: number; criticas: number } }> {
    try {
      await this.sincronizarNotificacoes(idUsuario);

      const query = `
        SELECT id_notificacao, codigo, titulo, mensagem, tipo, prioridade, canal, lida, arquivada,
               TO_CHAR(data_criacao, 'YYYY-MM-DD"T"HH24:MI:SS') AS data_criacao,
               TO_CHAR(data_vencimento, 'YYYY-MM-DD') AS data_vencimento,
               link
        FROM notificacao
        WHERE id_usuario = $1 AND arquivada = FALSE
        ORDER BY CASE prioridade
          WHEN 'critica' THEN 1
          WHEN 'alta' THEN 2
          WHEN 'media' THEN 3
          ELSE 4
        END, data_criacao DESC
      `;

      const resultado = await database.query(query, [idUsuario]);
      const notificacoes = resultado.rows.map((row: any) => ({
        id_notificacao: row.id_notificacao,
        codigo: row.codigo,
        titulo: row.titulo,
        mensagem: row.mensagem,
        tipo: row.tipo,
        prioridade: row.prioridade,
        canal: row.canal,
        lida: row.lida,
        arquivada: row.arquivada,
        data_criacao: row.data_criacao,
        data_vencimento: row.data_vencimento,
        link: row.link,
      }));

      const resumo = {
        total: notificacoes.length,
        naoLidas: notificacoes.filter((item) => !item.lida).length,
        criticas: notificacoes.filter((item) => item.prioridade === 'critica').length,
      };

      return { notificacoes, resumo };
    } catch (error) {
      logger.error({ error, idUsuario }, '[Notificacao] Erro ao listar notificações');
      throw error;
    }
  }

  static async obterPreferencias(idUsuario: number): Promise<PreferenciaNotificacaoDTO> {
    try {
      const query = `
        SELECT notificacoes_conta, notificacoes_parcela, notificacoes_meta, notificacoes_sistema,
               push_enabled, resumo_diario
        FROM notificacao_preferencia
        WHERE id_usuario = $1
      `;

      const resultado = await database.query(query, [idUsuario]);

      if (resultado.rowCount && resultado.rowCount > 0) {
        return resultado.rows[0];
      }

      await this.criarPreferenciasPadrao(idUsuario);
      return {
        notificacoes_conta: true,
        notificacoes_parcela: true,
        notificacoes_meta: true,
        notificacoes_sistema: true,
        push_enabled: false,
        resumo_diario: true,
      };
    } catch (error) {
      logger.error({ error, idUsuario }, '[Notificacao] Erro ao obter preferências');
      throw error;
    }
  }

  static async atualizarPreferencias(idUsuario: number, preferencias: Partial<PreferenciaNotificacaoDTO>): Promise<PreferenciaNotificacaoDTO> {
    try {
      const atuais = await this.obterPreferencias(idUsuario);
      const atualizadas = { ...atuais, ...preferencias };

      const query = `
        INSERT INTO notificacao_preferencia (
          id_usuario, notificacoes_conta, notificacoes_parcela, notificacoes_meta,
          notificacoes_sistema, push_enabled, resumo_diario, atualizada_em
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
        ON CONFLICT (id_usuario)
        DO UPDATE SET
          notificacoes_conta = EXCLUDED.notificacoes_conta,
          notificacoes_parcela = EXCLUDED.notificacoes_parcela,
          notificacoes_meta = EXCLUDED.notificacoes_meta,
          notificacoes_sistema = EXCLUDED.notificacoes_sistema,
          push_enabled = EXCLUDED.push_enabled,
          resumo_diario = EXCLUDED.resumo_diario,
          atualizada_em = CURRENT_TIMESTAMP
        RETURNING notificacoes_conta, notificacoes_parcela, notificacoes_meta,
                  notificacoes_sistema, push_enabled, resumo_diario
      `;

      const resultado = await database.query(query, [
        idUsuario,
        atualizadas.notificacoes_conta,
        atualizadas.notificacoes_parcela,
        atualizadas.notificacoes_meta,
        atualizadas.notificacoes_sistema,
        atualizadas.push_enabled,
        atualizadas.resumo_diario,
      ]);

      return resultado.rows[0];
    } catch (error) {
      logger.error({ error, idUsuario }, '[Notificacao] Erro ao atualizar preferências');
      throw error;
    }
  }

  static async marcarComoLida(idUsuario: number, idNotificacao: number): Promise<boolean> {
    try {
      const query = `
        UPDATE notificacao
        SET lida = TRUE
        WHERE id_notificacao = $1 AND id_usuario = $2
        RETURNING id_notificacao
      `;

      const resultado = await database.query(query, [idNotificacao, idUsuario]);
      return (resultado.rowCount ?? 0) > 0;
    } catch (error) {
      logger.error({ error, idUsuario, idNotificacao }, '[Notificacao] Erro ao marcar como lida');
      throw error;
    }
  }

  static async arquivar(idUsuario: number, idNotificacao: number): Promise<boolean> {
    try {
      const query = `
        UPDATE notificacao
        SET arquivada = TRUE
        WHERE id_notificacao = $1 AND id_usuario = $2
        RETURNING id_notificacao
      `;

      const resultado = await database.query(query, [idNotificacao, idUsuario]);
      return (resultado.rowCount ?? 0) > 0;
    } catch (error) {
      logger.error({ error, idUsuario, idNotificacao }, '[Notificacao] Erro ao arquivar notificação');
      throw error;
    }
  }

  private static async criarPreferenciasPadrao(idUsuario: number): Promise<void> {
    try {
      await database.query(`
        INSERT INTO notificacao_preferencia (
          id_usuario, notificacoes_conta, notificacoes_parcela, notificacoes_meta,
          notificacoes_sistema, push_enabled, resumo_diario, atualizada_em
        )
        VALUES ($1, TRUE, TRUE, TRUE, TRUE, FALSE, TRUE, CURRENT_TIMESTAMP)
        ON CONFLICT (id_usuario) DO NOTHING
      `, [idUsuario]);
    } catch (error) {
      logger.error({ error, idUsuario }, '[Notificacao] Erro ao criar preferências padrão');
      throw error;
    }
  }

  private static async sincronizarNotificacoes(idUsuario: number): Promise<void> {
    const preferencias = await this.obterPreferencias(idUsuario);

    if (preferencias.notificacoes_conta) {
      await this.sincronizarContas(idUsuario);
    }

    if (preferencias.notificacoes_parcela) {
      await this.sincronizarParcelas(idUsuario);
    }

    if (preferencias.notificacoes_meta) {
      await this.sincronizarMetas(idUsuario);
    }

    if (preferencias.notificacoes_sistema) {
      await this.sincronizarSistema(idUsuario);
    }
  }

  private static async sincronizarContas(idUsuario: number): Promise<void> {
    const query = `
      SELECT id_conta, descricao, valor, vencimento, status, categoria
      FROM caixa_pessoal_conta
      WHERE id_usuario = $1 AND pago = FALSE AND status IN ('pendente', 'programada', 'atrasada')
      ORDER BY vencimento ASC
    `;

    const resultado = await database.query(query, [idUsuario]);

    for (const conta of resultado.rows) {
      const vencimento = conta.vencimento instanceof Date ? conta.vencimento.toISOString().slice(0, 10) : conta.vencimento;
      const hoje = new Date();
      const dataVencimento = new Date(`${vencimento}T00:00:00`);
      const diff = Math.round((dataVencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

      let titulo = 'Conta próxima do vencimento';
      let mensagem = `${conta.descricao} vence em ${diff >= 0 ? `${diff} dias` : `${Math.abs(diff)} dias em atraso`}.`;
      let prioridade: NotificacaoDTO['prioridade'] = 'media';

      if (conta.status === 'atrasada' || diff < 0) {
        titulo = 'Conta atrasada';
        mensagem = `${conta.descricao} está vencida há ${Math.abs(diff)} dias.`;
        prioridade = 'critica';
      } else if (diff <= 3) {
        titulo = 'Conta vencendo em breve';
        prioridade = 'alta';
      }

      await this.inserirOuAtualizar(idUsuario, {
        codigo: `conta-${conta.id_conta}`,
        titulo,
        mensagem,
        tipo: 'conta',
        prioridade,
        canal: 'in_app',
        data_vencimento: vencimento,
        link: '/caixa',
      });
    }
  }

  private static async sincronizarParcelas(idUsuario: number): Promise<void> {
    const query = `
      SELECT p.id_parcela, p.data_vencimento, p.valor_esperado, p.numero_parcela, e.id_emprestimo
      FROM Parcela p
      JOIN Emprestimo e ON p.id_emprestimo = e.id_emprestimo
      WHERE p.status_parcela = 'pendente' AND e.status_emprestimo = TRUE
      ORDER BY p.data_vencimento ASC
    `;

    const resultado = await database.query(query);

    for (const parcela of resultado.rows) {
      const vencimento = parcela.data_vencimento instanceof Date ? parcela.data_vencimento.toISOString().slice(0, 10) : parcela.data_vencimento;
      const hoje = new Date();
      const dataVencimento = new Date(`${vencimento}T00:00:00`);
      const diff = Math.round((dataVencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

      if (diff > 7 || diff < 0) continue;

      await this.inserirOuAtualizar(idUsuario, {
        codigo: `parcela-${parcela.id_parcela}`,
        titulo: diff < 0 ? 'Parcela em atraso' : 'Parcela próxima do vencimento',
        mensagem: `A parcela ${parcela.numero_parcela} de R$ ${Number(parcela.valor_esperado).toFixed(2)} vence ${diff >= 0 ? `em ${diff} dias` : `há ${Math.abs(diff)} dias`}.`,
        tipo: 'parcela',
        prioridade: diff < 0 ? 'alta' : 'media',
        canal: 'in_app',
        data_vencimento: vencimento,
        link: '/emprestimos',
      });
    }
  }

  private static async sincronizarMetas(idUsuario: number): Promise<void> {
    const query = `
      SELECT id_meta, nome, prazo, valor_alvo, valor_atual
      FROM caixa_pessoal_meta
      WHERE id_usuario = $1 AND prazo IS NOT NULL
      ORDER BY prazo ASC
    `;

    const resultado = await database.query(query, [idUsuario]);

    for (const meta of resultado.rows) {
      const prazo = meta.prazo instanceof Date ? meta.prazo.toISOString().slice(0, 10) : meta.prazo;
      const hoje = new Date();
      const dataPrazo = new Date(`${prazo}T00:00:00`);
      const diff = Math.round((dataPrazo.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

      if (diff > 14 || diff < 0) continue;

      await this.inserirOuAtualizar(idUsuario, {
        codigo: `meta-${meta.id_meta}`,
        titulo: diff < 0 ? 'Meta ultrapassou o prazo' : 'Meta próxima do prazo',
        mensagem: `${meta.nome} está com prazo em ${diff >= 0 ? `${diff} dias` : `${Math.abs(diff)} dias`}.`,
        tipo: 'meta',
        prioridade: diff <= 3 ? 'alta' : 'media',
        canal: 'in_app',
        data_vencimento: prazo,
        link: '/caixa',
      });
    }
  }

  private static async sincronizarSistema(idUsuario: number): Promise<void> {
    await this.inserirOuAtualizar(idUsuario, {
      codigo: 'system-welcome',
      titulo: 'Central de notificações pronta',
      mensagem: 'Receba alertas financeiros e configure preferências para o seu fluxo.',
      tipo: 'sistema',
      prioridade: 'baixa',
      canal: 'in_app',
      link: '/notificacoes',
    });
  }

  private static async inserirOuAtualizar(idUsuario: number, notificacao: Omit<NotificacaoDTO, 'id_notificacao' | 'lida' | 'arquivada'>): Promise<void> {
    const query = `
      INSERT INTO notificacao (
        id_usuario, codigo, titulo, mensagem, tipo, prioridade, canal, data_criacao, data_vencimento, link
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, $8::date, $9)
      ON CONFLICT (id_usuario, codigo)
      DO UPDATE SET
        titulo = EXCLUDED.titulo,
        mensagem = EXCLUDED.mensagem,
        tipo = EXCLUDED.tipo,
        prioridade = EXCLUDED.prioridade,
        canal = EXCLUDED.canal,
        data_vencimento = EXCLUDED.data_vencimento,
        link = EXCLUDED.link
    `;

    await database.query(query, [idUsuario, notificacao.codigo, notificacao.titulo, notificacao.mensagem, notificacao.tipo, notificacao.prioridade, notificacao.canal, notificacao.data_vencimento || null, notificacao.link || null]);
  }
}
