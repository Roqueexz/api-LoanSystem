import type CaixaDTO from "../interface/CaixaDTO.js";
import databaseInstance from "./DatabaseModel.js";
import logger from "../services/Logger.js";
import { formatarDataISO } from "../services/Utilitario.js";

const database = databaseInstance.pool;

export default class Caixa {
  static async obterResumoFinanceiro(): Promise<CaixaDTO> {
    try {
      // 1. Total emprestado
      const queryTotalEmprestado = `
                SELECT COALESCE(SUM(valor_emprestimo), 0) AS total
                FROM Emprestimo
                WHERE status_emprestimo = TRUE
            `;
      const resEmprestado = await database.query(queryTotalEmprestado);
      const totalEmprestado = Number(resEmprestado.rows[0]?.total || 0);

      // 2. Total recebido
      const queryTotalRecebido = `
                SELECT COALESCE(SUM(valor_pago), 0) AS total
                FROM Parcela
                WHERE status_parcela = 'pago'
            `;
      const resRecebido = await database.query(queryTotalRecebido);
      const totalRecebido = Number(resRecebido.rows[0]?.total || 0);

      // 3. Total a receber (soma do que falta receber de cada emprestimo ativo)
      const queryPendente = `
                SELECT COALESCE(SUM(
                    e.valor_emprestimo - COALESCE(
                        (SELECT SUM(valor_pago) FROM Parcela p WHERE p.id_emprestimo = e.id_emprestimo AND p.status_parcela = 'pago'), 0
                    )
                ), 0) AS total
                FROM Emprestimo e
                WHERE e.status_emprestimo = TRUE
            `;
      const resPendente = await database.query(queryPendente);
      const entradaPendente = Number(resPendente.rows[0]?.total || 0);

      // 4. Total atrasado
      const queryAtrasado = `
                SELECT COALESCE(SUM(valor_esperado - valor_pago), 0) AS total
                FROM Parcela
                WHERE status_parcela = 'pendente'
                AND data_vencimento < CURRENT_DATE
            `;
      const resAtrasado = await database.query(queryAtrasado);
      const totalAtrasado = Number(resAtrasado.rows[0]?.total || 0);

      // 5. Lucro previsto
      const queryLucro = `
                SELECT COALESCE(SUM(
                    (e.valor_parcela * e.num_parcelas) - e.valor_emprestimo
                ), 0) AS total
                FROM Emprestimo e
                WHERE e.status_emprestimo = TRUE
            `;
      const resLucro = await database.query(queryLucro);
      const lucroPrevisto = Number(resLucro.rows[0]?.total || 0);

      // 6. Total de clientes ativos
      const queryClientes = `
                SELECT COUNT(*) AS total
                FROM Cliente
                WHERE status_cliente = TRUE
            `;
      const resClientes = await database.query(queryClientes);
      const totalClientes = Number(resClientes.rows[0]?.total || 0);

      // 7. Total de emprestimos ativos
      const queryEmprestimos = `
                SELECT COUNT(*) AS total
                FROM Emprestimo
                WHERE status_emprestimo = TRUE
            `;
      const resEmprestimos = await database.query(queryEmprestimos);
      const totalEmprestimos = Number(resEmprestimos.rows[0]?.total || 0);

      logger.info(
        {
          totalEmprestado,
          totalRecebido,
          entradaPendente,
          lucroPrevisto,
          totalClientes,
          totalEmprestimos,
          totalAtrasado,
        },
        "Resumo financeiro calculado com sucesso",
      );

      return {
        totalEmprestado,
        totalRecebido,
        entradaPendente,
        lucroPrevisto,
        totalClientes,
        totalEmprestimos,
        totalAtrasado,
      };
    } catch (error) {
      logger.error({ error }, "[CaixaModel] Erro ao gerar resumo financeiro");
      throw error;
    }
  }

  // ─── RELATÓRIO DIÁRIO ──────────────────────────────────────────────
  static async obterRelatorioDiario(data?: string): Promise<any> {
    try {
      const dataBase = data ? new Date(data) : new Date();
      const dataStr = formatarDataISO(dataBase);

      // Parcelas pagas no dia
      const queryRecebido = `
                SELECT COALESCE(SUM(valor_pago), 0) AS total
                FROM Parcela
                WHERE data_pagamento = $1
                AND status_parcela = 'pago'
            `;
      const resRecebido = await database.query(queryRecebido, [dataStr]);
      const recebido = Number(resRecebido.rows[0]?.total || 0);

      // Emprestimos feitos no dia
      const queryEmprestado = `
                SELECT COALESCE(SUM(valor_emprestimo), 0) AS total
                FROM Emprestimo
                WHERE data_emprestimo = $1
            `;
      const resEmprestado = await database.query(queryEmprestado, [dataStr]);
      const emprestado = Number(resEmprestado.rows[0]?.total || 0);

      // Parcelas que vencem hoje
      const queryVencendo = `
                SELECT COUNT(*) AS total
                FROM Parcela
                WHERE data_vencimento = $1
                AND status_parcela = 'pendente'
            `;
      const resVencendo = await database.query(queryVencendo, [dataStr]);
      const parcelasVencendo = Number(resVencendo.rows[0]?.total || 0);

      // Parcelas atrasadas (vencidas e nao pagas)
      const queryAtrasadas = `
                SELECT COUNT(*) AS total
                FROM Parcela
                WHERE data_vencimento < $1
                AND status_parcela = 'pendente'
            `;
      const resAtrasadas = await database.query(queryAtrasadas, [dataStr]);
      const parcelasAtrasadas = Number(resAtrasadas.rows[0]?.total || 0);

      return {
        data: dataStr,
        recebido,
        emprestado,
        parcelasVencendo,
        parcelasAtrasadas,
      };
    } catch (error) {
      logger.error(
        { error, data },
        "[CaixaModel] Erro ao obter relatorio diario",
      );
      throw error;
    }
  }

  // ─── RELATÓRIO MENSAL ──────────────────────────────────────────────
  static async obterRelatorioMensal(ano?: number, mes?: number): Promise<any> {
    try {
      const dataBase = new Date();
      const anoBase = ano || dataBase.getFullYear();
      const mesBase = mes !== undefined ? mes : dataBase.getMonth() + 1;

      const dataInicio = `${anoBase}-${String(mesBase).padStart(2, "0")}-01`;
      const ultimoDia = new Date(anoBase, mesBase, 0).getDate();
      const dataFim = `${anoBase}-${String(mesBase).padStart(2, "0")}-${String(ultimoDia).padStart(2, "0")}`;

      // Recebido no mes
      const queryRecebido = `
                SELECT COALESCE(SUM(valor_pago), 0) AS total
                FROM Parcela
                WHERE data_pagamento BETWEEN $1 AND $2
                AND status_parcela = 'pago'
            `;
      const resRecebido = await database.query(queryRecebido, [
        dataInicio,
        dataFim,
      ]);
      const recebido = Number(resRecebido.rows[0]?.total || 0);

      // Emprestado no mes
      const queryEmprestado = `
                SELECT COALESCE(SUM(valor_emprestimo), 0) AS total
                FROM Emprestimo
                WHERE data_emprestimo BETWEEN $1 AND $2
            `;
      const resEmprestado = await database.query(queryEmprestado, [
        dataInicio,
        dataFim,
      ]);
      const emprestado = Number(resEmprestado.rows[0]?.total || 0);

      // Mes anterior para calcular crescimento
      const mesAnterior = mesBase === 1 ? 12 : mesBase - 1;
      const anoAnterior = mesBase === 1 ? anoBase - 1 : anoBase;
      const dataInicioAnt = `${anoAnterior}-${String(mesAnterior).padStart(2, "0")}-01`;
      const ultimoDiaAnt = new Date(anoAnterior, mesAnterior, 0).getDate();
      const dataFimAnt = `${anoAnterior}-${String(mesAnterior).padStart(2, "0")}-${String(ultimoDiaAnt).padStart(2, "0")}`;

      const queryMesAnterior = `
                SELECT COALESCE(SUM(valor_pago), 0) AS total
                FROM Parcela
                WHERE data_pagamento BETWEEN $1 AND $2
                AND status_parcela = 'pago'
            `;
      const resMesAnterior = await database.query(queryMesAnterior, [
        dataInicioAnt,
        dataFimAnt,
      ]);
      const totalMesAnterior = Number(resMesAnterior.rows[0]?.total || 0);

      const crescimento =
        totalMesAnterior > 0
          ? ((recebido - totalMesAnterior) / totalMesAnterior) * 100
          : recebido > 0
            ? 100
            : 0;

      return {
        mes: `${String(mesBase).padStart(2, "0")}/${anoBase}`,
        recebido,
        emprestado,
        crescimento: Math.round(crescimento * 100) / 100,
      };
    } catch (error) {
      logger.error(
        { error, ano, mes },
        "[CaixaModel] Erro ao obter relatorio mensal",
      );
      throw error;
    }
  }

  // ─── RELATÓRIO ANUAL ───────────────────────────────────────────────
  static async obterRelatorioAnual(ano?: number): Promise<any[]> {
    try {
      const dataBase = new Date();
      const anoBase = ano || dataBase.getFullYear();

      const resultados = [];

      for (let mes = 1; mes <= 12; mes++) {
        const dataInicio = `${anoBase}-${String(mes).padStart(2, "0")}-01`;
        const ultimoDia = new Date(anoBase, mes, 0).getDate();
        const dataFim = `${anoBase}-${String(mes).padStart(2, "0")}-${String(ultimoDia).padStart(2, "0")}`;

        // Recebido no mes
        const queryRecebido = `
                    SELECT COALESCE(SUM(valor_pago), 0) AS total
                    FROM Parcela
                    WHERE data_pagamento BETWEEN $1 AND $2
                    AND status_parcela = 'pago'
                `;
        const resRecebido = await database.query(queryRecebido, [
          dataInicio,
          dataFim,
        ]);
        const recebido = Number(resRecebido.rows[0]?.total || 0);

        // Emprestado no mes
        const queryEmprestado = `
                    SELECT COALESCE(SUM(valor_emprestimo), 0) AS total
                    FROM Emprestimo
                    WHERE data_emprestimo BETWEEN $1 AND $2
                `;
        const resEmprestado = await database.query(queryEmprestado, [
          dataInicio,
          dataFim,
        ]);
        const emprestado = Number(resEmprestado.rows[0]?.total || 0);

        resultados.push({
          mes: `${String(mes).padStart(2, "0")}/${anoBase}`,
          recebido,
          emprestado,
          lucro: recebido - emprestado,
        });
      }

      return resultados;
    } catch (error) {
      logger.error(
        { error, ano },
        "[CaixaModel] Erro ao obter relatorio anual",
      );
      throw error;
    }
  }

  // ─── DASHBOARD INTELIGENTE ────────────────────────────────────────
  static async obterDashboardInteligente(): Promise<any> {
    try {
      const dataAtual = new Date();
      const primeiroDiaMes = new Date(
        dataAtual.getFullYear(),
        dataAtual.getMonth(),
        1,
      );
      const dataAtualStr = formatarDataISO(dataAtual);
      const primeiroDiaMesStr = formatarDataISO(primeiroDiaMes);

      // 1. Saldo disponível (total recebido - total emprestado)
      const querySaldoDisponivel = `
                SELECT 
                    COALESCE(SUM(CASE WHEN status_parcela = 'pago' THEN valor_pago ELSE 0 END), 0) AS recebido,
                    COALESCE(SUM(CASE WHEN status_parcela = 'pago' THEN 0 ELSE valor_esperado END), 0) AS pendente
                FROM Parcela
            `;
      const resSaldo = await database.query(querySaldoDisponivel);
      const totalRecebido = Number(resSaldo.rows[0]?.recebido || 0);
      const totalPendente = Number(resSaldo.rows[0]?.pendente || 0);
      const saldoDisponivel = totalRecebido - totalPendente;

      // 2. Saldo reservado (parcelas que vencem este mês)
      const querySaldoReservado = `
                SELECT COALESCE(SUM(valor_esperado), 0) AS total
                FROM Parcela
                WHERE data_vencimento BETWEEN $1 AND $2
                AND status_parcela = 'pendente'
            `;
      const resReservado = await database.query(querySaldoReservado, [
        primeiroDiaMesStr,
        dataAtualStr,
      ]);
      const saldoReservado = Number(resReservado.rows[0]?.total || 0);

      // 3. Receitas do mês
      const queryReceitasMes = `
                SELECT COALESCE(SUM(valor_pago), 0) AS total
                FROM Parcela
                WHERE data_pagamento BETWEEN $1 AND $2
                AND status_parcela = 'pago'
            `;
      const resReceitas = await database.query(queryReceitasMes, [
        primeiroDiaMesStr,
        dataAtualStr,
      ]);
      const receitasMes = Number(resReceitas.rows[0]?.total || 0);

      // 4. Despesas do mês (empréstimos feitos este mês)
      const queryDespesasMes = `
                SELECT COALESCE(SUM(valor_emprestimo), 0) AS total
                FROM Emprestimo
                WHERE data_emprestimo BETWEEN $1 AND $2
            `;
      const resDespesas = await database.query(queryDespesasMes, [
        primeiroDiaMesStr,
        dataAtualStr,
      ]);
      const despesasMes = Number(resDespesas.rows[0]?.total || 0);

      // 5. Fluxo de caixa (receitas - despesas)
      const fluxoCaixa = receitasMes - despesasMes;

      // 6. Parcelas recebidas hoje
      const queryParcelasHoje = `
                SELECT COUNT(*) AS total
                FROM Parcela
                WHERE data_pagamento = $1
                AND status_parcela = 'pago'
            `;
      const resParcelasHoje = await database.query(queryParcelasHoje, [
        dataAtualStr,
      ]);
      const parcelasRecebidasHoje = Number(resParcelasHoje.rows[0]?.total || 0);

      // 7. Parcelas atrasadas
      const queryParcelasAtrasadas = `
                SELECT COUNT(*) AS total
                FROM Parcela
                WHERE data_vencimento < $1
                AND status_parcela = 'pendente'
            `;
      const resParcelasAtrasadas = await database.query(
        queryParcelasAtrasadas,
        [dataAtualStr],
      );
      const parcelasAtrasadas = Number(
        resParcelasAtrasadas.rows[0]?.total || 0,
      );

      // 8. Clientes inadimplentes
      const queryClientesInadimplentes = `
                SELECT COUNT(DISTINCT id_cliente) AS total
                FROM Parcela p
                JOIN Emprestimo e ON p.id_emprestimo = e.id_emprestimo
                WHERE p.data_vencimento < $1
                AND p.status_parcela = 'pendente'
                AND e.status_emprestimo = TRUE
            `;
      const resClientesInadimplentes = await database.query(
        queryClientesInadimplentes,
        [dataAtualStr],
      );
      const clientesInadimplentes = Number(
        resClientesInadimplentes.rows[0]?.total || 0,
      );

      // 9. Gráficos - Receitas por dia (últimos 7 dias)
      const queryReceitasPorDia = `
                SELECT 
                    data_pagamento,
                    COALESCE(SUM(valor_pago), 0) AS total
                FROM Parcela
                WHERE data_pagamento >= $1
                AND status_parcela = 'pago'
                GROUP BY data_pagamento
                ORDER BY data_pagamento
            `;
      const seteDiasAtras = new Date(dataAtual);
      seteDiasAtras.setDate(dataAtual.getDate() - 7);
      const resReceitasPorDia = await database.query(queryReceitasPorDia, [
        formatarDataISO(seteDiasAtras),
      ]);

      // 10. Indicadores financeiros
      const queryIndicadores = `
                SELECT 
                    COUNT(*) AS totalEmprestimos,
                    COALESCE(SUM(valor_emprestimo), 0) AS valorTotalEmprestimos,
                    COUNT(DISTINCT id_cliente) AS totalClientes
                FROM Emprestimo
                WHERE status_emprestimo = TRUE
            `;
      const resIndicadores = await database.query(queryIndicadores);

      return {
        saldoDisponivel,
        saldoReservado,
        receitasMes,
        despesasMes,
        fluxoCaixa,
        parcelasRecebidasHoje,
        parcelasAtrasadas,
        clientesInadimplentes,
        graficos: {
          receitasPorDia: resReceitasPorDia.rows,
        },
        indicadores: {
          totalEmprestimos: Number(
            resIndicadores.rows[0]?.totalemprestimos || 0,
          ),
          valorTotalEmprestimos: Number(
            resIndicadores.rows[0]?.valortotalemprestimos || 0,
          ),
          totalClientes: Number(resIndicadores.rows[0]?.totalclientes || 0),
        },
      };
    } catch (error) {
      logger.error(
        { error },
        "[CaixaModel] Erro ao obter dashboard inteligente",
      );
      throw error;
    }
  }

  // ─── INDICADORES FINANCEIROS ──────────────────────────────────────
  static async obterIndicadoresFinanceiros(): Promise<any> {
    try {
      const dataAtual = new Date();
      const dataAtualStr = formatarDataISO(dataAtual);

      // Indicadores detalhados
      const queryIndicadores = `
                SELECT 
                    COUNT(*) AS totalEmprestimos,
                    COALESCE(SUM(valor_emprestimo), 0) AS valorTotalEmprestimos,
                    COUNT(DISTINCT id_cliente) AS totalClientes,
                    COALESCE(SUM(CASE WHEN status_emprestimo = TRUE THEN 1 ELSE 0 END), 0) AS emprestimosAtivos,
                    COALESCE(SUM(CASE WHEN status_emprestimo = FALSE THEN 1 ELSE 0 END), 0) AS emprestimosConcluidos
                FROM Emprestimo
            `;
      const resIndicadores = await database.query(queryIndicadores);

      // Taxa de inadimplência
      const queryInadimplencia = `
                SELECT 
                    COUNT(*) AS totalParcelas,
                    COALESCE(SUM(CASE WHEN status_parcela = 'pendente' AND data_vencimento < $1 THEN 1 ELSE 0 END), 0) AS parcelasAtrasadas
                FROM Parcela
            `;
      const resInadimplencia = await database.query(queryInadimplencia, [
        dataAtualStr,
      ]);
      const totalParcelas = Number(
        resInadimplencia.rows[0]?.totalparcelas || 1,
      );
      const parcelasAtrasadas = Number(
        resInadimplencia.rows[0]?.parcelasatrasadas || 0,
      );
      const taxaInadimplencia = (parcelasAtrasadas / totalParcelas) * 100;

      // Rentabilidade média
      const queryRentabilidade = `
                SELECT 
                    COALESCE(AVG((valor_parcela * num_parcelas) - valor_emprestimo), 0) AS rentabilidadeMedia
                FROM Emprestimo
                WHERE status_emprestimo = TRUE
            `;
      const resRentabilidade = await database.query(queryRentabilidade);
      const rentabilidadeMedia = Number(
        resRentabilidade.rows[0]?.rentabilidademedia || 0,
      );

      return {
        totalEmprestimos: Number(resIndicadores.rows[0]?.totalemprestimos || 0),
        valorTotalEmprestimos: Number(
          resIndicadores.rows[0]?.valortotalemprestimos || 0,
        ),
        totalClientes: Number(resIndicadores.rows[0]?.totalclientes || 0),
        emprestimosAtivos: Number(
          resIndicadores.rows[0]?.emprestimosativos || 0,
        ),
        emprestimosConcluidos: Number(
          resIndicadores.rows[0]?.emprestimosconcluidos || 0,
        ),
        taxaInadimplencia: Math.round(taxaInadimplencia * 100) / 100,
        rentabilidadeMedia: Math.round(rentabilidadeMedia * 100) / 100,
      };
    } catch (error) {
      logger.error(
        { error },
        "[CaixaModel] Erro ao obter indicadores financeiros",
      );
      throw error;
    }
  }
}
