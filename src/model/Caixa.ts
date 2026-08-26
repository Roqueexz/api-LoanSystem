import type CaixaDTO from "../interface/CaixaDTO.js";
import databaseInstance from "./DatabaseModel.js";
import logger from "../services/Logger.js";
import { formatarDataISO } from "../services/Utilitario.js";

const database = databaseInstance.pool;

export default class Caixa {
  static async obterResumoFinanceiro(id_usuario: number): Promise<CaixaDTO> {
    try {
      const queryTotalEmprestado = `
        SELECT COALESCE(SUM(e.valor_emprestimo), 0) AS total
        FROM Emprestimo e
        WHERE e.status_emprestimo = TRUE AND e.id_usuario = $1
      `;
      const resEmprestado = await database.query(queryTotalEmprestado, [id_usuario]);
      const totalEmprestado = Number(resEmprestado.rows[0]?.total || 0);

      const queryTotalRecebido = `
        SELECT COALESCE(SUM(COALESCE(p.valor_pago, p.valor_esperado)), 0) AS total
        FROM Parcela p
        JOIN Emprestimo e ON p.id_emprestimo = e.id_emprestimo
        WHERE (LOWER(p.status_parcela) IN ('pago', 'paga') OR p.data_pagamento IS NOT NULL) AND e.id_usuario = $1
      `;
      const resRecebido = await database.query(queryTotalRecebido, [id_usuario]);
      const totalRecebido = Number(resRecebido.rows[0]?.total || 0);

      const queryPendente = `
        SELECT COALESCE(SUM(
            e.valor_emprestimo - COALESCE(
                (SELECT SUM(COALESCE(valor_pago, valor_esperado)) FROM Parcela p WHERE p.id_emprestimo = e.id_emprestimo AND (LOWER(p.status_parcela) IN ('pago', 'paga') OR p.data_pagamento IS NOT NULL)), 0
            )
        ), 0) AS total
        FROM Emprestimo e
        WHERE e.status_emprestimo = TRUE AND e.id_usuario = $1
      `;
      const resPendente = await database.query(queryPendente, [id_usuario]);
      const entradaPendente = Number(resPendente.rows[0]?.total || 0);

      const queryAtrasado = `
        SELECT COALESCE(SUM(p.valor_esperado - COALESCE(p.valor_pago, 0)), 0) AS total
        FROM Parcela p
        JOIN Emprestimo e ON p.id_emprestimo = e.id_emprestimo
        WHERE (LOWER(p.status_parcela) IN ('pendente', 'atrasada', 'atrasado') OR p.data_pagamento IS NULL)
        AND DATE(p.data_vencimento) < CURRENT_DATE
        AND e.id_usuario = $1
      `;
      const resAtrasado = await database.query(queryAtrasado, [id_usuario]);
      const totalAtrasado = Number(resAtrasado.rows[0]?.total || 0);

      const queryLucro = `
        SELECT COALESCE(SUM(
            (e.valor_parcela * e.num_parcelas) - e.valor_emprestimo
        ), 0) AS total
        FROM Emprestimo e
        WHERE e.status_emprestimo = TRUE AND e.id_usuario = $1
      `;
      const resLucro = await database.query(queryLucro, [id_usuario]);
      const lucroPrevisto = Number(resLucro.rows[0]?.total || 0);

      const queryClientes = `
        SELECT COUNT(*) AS total
        FROM Cliente c
        WHERE c.status_cliente = TRUE AND c.id_usuario = $1
      `;
      const resClientes = await database.query(queryClientes, [id_usuario]);
      const totalClientes = Number(resClientes.rows[0]?.total || 0);

      const queryEmprestimos = `
        SELECT COUNT(*) AS total
        FROM Emprestimo e
        WHERE e.status_emprestimo = TRUE AND e.id_usuario = $1
      `;
      const resEmprestimos = await database.query(queryEmprestimos, [id_usuario]);
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

  static async obterRelatorioDiario(id_usuario: number, data?: string): Promise<any> {
    try {
      const dataBase = data ? new Date(data) : new Date();
      const dataStr = formatarDataISO(dataBase);

      const queryRecebido = `
        SELECT COALESCE(SUM(COALESCE(p.valor_pago, p.valor_esperado)), 0) AS total
        FROM Parcela p
        JOIN Emprestimo e ON p.id_emprestimo = e.id_emprestimo
        WHERE DATE(p.data_pagamento) = $1
        AND (LOWER(p.status_parcela) IN ('pago', 'paga') OR p.data_pagamento IS NOT NULL)
        AND e.id_usuario = $2
      `;
      const resRecebido = await database.query(queryRecebido, [dataStr, id_usuario]);
      const recebido = Number(resRecebido.rows[0]?.total || 0);

      const queryEmprestado = `
        SELECT COALESCE(SUM(e.valor_emprestimo), 0) AS total
        FROM Emprestimo e
        WHERE DATE(e.data_emprestimo) = $1 AND e.id_usuario = $2
      `;
      const resEmprestado = await database.query(queryEmprestado, [dataStr, id_usuario]);
      const emprestado = Number(resEmprestado.rows[0]?.total || 0);

      const queryVencendo = `
        SELECT COUNT(*) AS total
        FROM Parcela p
        JOIN Emprestimo e ON p.id_emprestimo = e.id_emprestimo
        WHERE DATE(p.data_vencimento) = $1
        AND (LOWER(p.status_parcela) IN ('pendente', 'atrasada', 'atrasado') OR p.data_pagamento IS NULL)
        AND e.id_usuario = $2
      `;
      const resVencendo = await database.query(queryVencendo, [dataStr, id_usuario]);
      const parcelasVencendo = Number(resVencendo.rows[0]?.total || 0);

      const queryAtrasadas = `
        SELECT COUNT(*) AS total
        FROM Parcela p
        JOIN Emprestimo e ON p.id_emprestimo = e.id_emprestimo
        WHERE DATE(p.data_vencimento) < $1
        AND (LOWER(p.status_parcela) IN ('pendente', 'atrasada', 'atrasado') OR p.data_pagamento IS NULL)
        AND e.id_usuario = $2
      `;
      const resAtrasadas = await database.query(queryAtrasadas, [dataStr, id_usuario]);
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

  static async obterRelatorioMensal(id_usuario: number, ano?: number, mes?: number): Promise<any> {
    try {
      const dataBase = new Date();
      const anoBase = ano || dataBase.getFullYear();
      const mesBase = mes !== undefined ? mes : dataBase.getMonth() + 1;

      const dataInicio = `${anoBase}-${String(mesBase).padStart(2, "0")}-01`;
      const ultimoDia = new Date(anoBase, mesBase, 0).getDate();
      const dataFim = `${anoBase}-${String(mesBase).padStart(2, "0")}-${String(ultimoDia).padStart(2, "0")}`;

      const queryRecebido = `
        SELECT COALESCE(SUM(COALESCE(p.valor_pago, p.valor_esperado)), 0) AS total
        FROM Parcela p
        JOIN Emprestimo e ON p.id_emprestimo = e.id_emprestimo
        WHERE DATE(p.data_pagamento) BETWEEN $1 AND $2
        AND (LOWER(p.status_parcela) IN ('pago', 'paga') OR p.data_pagamento IS NOT NULL)
        AND e.id_usuario = $3
      `;
      const resRecebido = await database.query(queryRecebido, [
        dataInicio,
        dataFim,
        id_usuario,
      ]);
      const recebido = Number(resRecebido.rows[0]?.total || 0);

      const queryEmprestado = `
        SELECT COALESCE(SUM(e.valor_emprestimo), 0) AS total
        FROM Emprestimo e
        WHERE DATE(e.data_emprestimo) BETWEEN $1 AND $2
        AND e.id_usuario = $3
      `;
      const resEmprestado = await database.query(queryEmprestado, [
        dataInicio,
        dataFim,
        id_usuario,
      ]);
      const emprestado = Number(resEmprestado.rows[0]?.total || 0);

      const mesAnterior = mesBase === 1 ? 12 : mesBase - 1;
      const anoAnterior = mesBase === 1 ? anoBase - 1 : anoBase;
      const dataInicioAnt = `${anoAnterior}-${String(mesAnterior).padStart(2, "0")}-01`;
      const ultimoDiaAnt = new Date(anoAnterior, mesAnterior, 0).getDate();
      const dataFimAnt = `${anoAnterior}-${String(mesAnterior).padStart(2, "0")}-${String(ultimoDiaAnt).padStart(2, "0")}`;

      const queryMesAnterior = `
        SELECT COALESCE(SUM(COALESCE(p.valor_pago, p.valor_esperado)), 0) AS total
        FROM Parcela p
        JOIN Emprestimo e ON p.id_emprestimo = e.id_emprestimo
        WHERE DATE(p.data_pagamento) BETWEEN $1 AND $2
        AND (LOWER(p.status_parcela) IN ('pago', 'paga') OR p.data_pagamento IS NOT NULL)
        AND e.id_usuario = $3
      `;
      const resMesAnterior = await database.query(queryMesAnterior, [
        dataInicioAnt,
        dataFimAnt,
        id_usuario,
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

  static async obterRelatorioAnual(id_usuario: number, ano?: number): Promise<any[]> {
    try {
      const dataBase = new Date();
      const anoBase = ano || dataBase.getFullYear();

      const resultados = [];

      for (let mes = 1; mes <= 12; mes++) {
        const dataInicio = `${anoBase}-${String(mes).padStart(2, "0")}-01`;
        const ultimoDia = new Date(anoBase, mes, 0).getDate();
        const dataFim = `${anoBase}-${String(mes).padStart(2, "0")}-${String(ultimoDia).padStart(2, "0")}`;

        const queryRecebido = `
          SELECT COALESCE(SUM(COALESCE(p.valor_pago, p.valor_esperado)), 0) AS total
          FROM Parcela p
          JOIN Emprestimo e ON p.id_emprestimo = e.id_emprestimo
          WHERE DATE(p.data_pagamento) BETWEEN $1 AND $2
          AND (LOWER(p.status_parcela) IN ('pago', 'paga') OR p.data_pagamento IS NOT NULL)
          AND e.id_usuario = $3
        `;
        const resRecebido = await database.query(queryRecebido, [
          dataInicio,
          dataFim,
          id_usuario,
        ]);
        const recebido = Number(resRecebido.rows[0]?.total || 0);

        const queryEmprestado = `
          SELECT COALESCE(SUM(e.valor_emprestimo), 0) AS total
          FROM Emprestimo e
          WHERE DATE(e.data_emprestimo) BETWEEN $1 AND $2
          AND e.id_usuario = $3
        `;
        const resEmprestado = await database.query(queryEmprestado, [
          dataInicio,
          dataFim,
          id_usuario,
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

  static async obterDashboardInteligente(id_usuario: number): Promise<any> {
    try {
      const dataAtual = new Date();
      const primeiroDiaMes = new Date(
        dataAtual.getFullYear(),
        dataAtual.getMonth(),
        1,
      );
      const dataAtualStr = formatarDataISO(dataAtual);
      const primeiroDiaMesStr = formatarDataISO(primeiroDiaMes);

      const querySaldoDisponivel = `
        SELECT 
            COALESCE(SUM(CASE WHEN (LOWER(p.status_parcela) IN ('pago', 'paga') OR p.data_pagamento IS NOT NULL) THEN COALESCE(p.valor_pago, p.valor_esperado) ELSE 0 END), 0) AS recebido,
            COALESCE(SUM(CASE WHEN (LOWER(p.status_parcela) IN ('pago', 'paga') OR p.data_pagamento IS NOT NULL) THEN 0 ELSE p.valor_esperado END), 0) AS pendente
        FROM Parcela p
        JOIN Emprestimo e ON p.id_emprestimo = e.id_emprestimo
        WHERE e.id_usuario = $1
      `;
      const resSaldo = await database.query(querySaldoDisponivel, [id_usuario]);
      const totalRecebido = Number(resSaldo.rows[0]?.recebido || 0);
      const totalPendente = Number(resSaldo.rows[0]?.pendente || 0);
      const saldoDisponivel = totalRecebido - totalPendente;

      const querySaldoReservado = `
        SELECT COALESCE(SUM(p.valor_esperado), 0) AS total
        FROM Parcela p
        JOIN Emprestimo e ON p.id_emprestimo = e.id_emprestimo
        WHERE DATE(p.data_vencimento) BETWEEN $1 AND $2
        AND (LOWER(p.status_parcela) IN ('pendente', 'atrasada', 'atrasado') OR p.data_pagamento IS NULL)
        AND e.id_usuario = $3
      `;
      const resReservado = await database.query(querySaldoReservado, [
        primeiroDiaMesStr,
        dataAtualStr,
        id_usuario,
      ]);
      const saldoReservado = Number(resReservado.rows[0]?.total || 0);

      const queryReceitasMes = `
        SELECT COALESCE(SUM(COALESCE(p.valor_pago, p.valor_esperado)), 0) AS total
        FROM Parcela p
        JOIN Emprestimo e ON p.id_emprestimo = e.id_emprestimo
        WHERE DATE(p.data_pagamento) BETWEEN $1 AND $2
        AND (LOWER(p.status_parcela) IN ('pago', 'paga') OR p.data_pagamento IS NOT NULL)
        AND e.id_usuario = $3
      `;
      const resReceitas = await database.query(queryReceitasMes, [
        primeiroDiaMesStr,
        dataAtualStr,
        id_usuario,
      ]);
      const receitasMes = Number(resReceitas.rows[0]?.total || 0);

      const queryDespesasMes = `
        SELECT COALESCE(SUM(e.valor_emprestimo), 0) AS total
        FROM Emprestimo e
        WHERE DATE(e.data_emprestimo) BETWEEN $1 AND $2
        AND e.id_usuario = $3
      `;
      const resDespesas = await database.query(queryDespesasMes, [
        primeiroDiaMesStr,
        dataAtualStr,
        id_usuario,
      ]);
      const despesasMes = Number(resDespesas.rows[0]?.total || 0);

      const fluxoCaixa = receitasMes - despesasMes;

      const queryParcelasHoje = `
        SELECT COUNT(*) AS total
        FROM Parcela p
        JOIN Emprestimo e ON p.id_emprestimo = e.id_emprestimo
        WHERE DATE(p.data_pagamento) = $1
        AND (LOWER(p.status_parcela) IN ('pago', 'paga') OR p.data_pagamento IS NOT NULL)
        AND e.id_usuario = $2
      `;
      const resParcelasHoje = await database.query(queryParcelasHoje, [
        dataAtualStr,
        id_usuario,
      ]);
      const parcelasRecebidasHoje = Number(resParcelasHoje.rows[0]?.total || 0);

      const queryParcelasAtrasadas = `
        SELECT COUNT(*) AS total
        FROM Parcela p
        JOIN Emprestimo e ON p.id_emprestimo = e.id_emprestimo
        WHERE DATE(p.data_vencimento) < $1
        AND (LOWER(p.status_parcela) IN ('pendente', 'atrasada', 'atrasado') OR p.data_pagamento IS NULL)
        AND e.id_usuario = $2
      `;
      const resParcelasAtrasadas = await database.query(
        queryParcelasAtrasadas,
        [dataAtualStr, id_usuario],
      );
      const parcelasAtrasadas = Number(
        resParcelasAtrasadas.rows[0]?.total || 0,
      );

      const queryClientesInadimplentes = `
        SELECT COUNT(DISTINCT e.id_cliente) AS total
        FROM Parcela p
        JOIN Emprestimo e ON p.id_emprestimo = e.id_emprestimo
        WHERE DATE(p.data_vencimento) < $1
        AND (LOWER(p.status_parcela) IN ('pendente', 'atrasada', 'atrasado') OR p.data_pagamento IS NULL)
        AND e.status_emprestimo = TRUE
        AND e.id_usuario = $2
      `;
      const resClientesInadimplentes = await database.query(
        queryClientesInadimplentes,
        [dataAtualStr, id_usuario],
      );
      const clientesInadimplentes = Number(
        resClientesInadimplentes.rows[0]?.total || 0,
      );

      const queryReceitasPorDia = `
        SELECT 
            p.data_pagamento,
            COALESCE(SUM(COALESCE(p.valor_pago, p.valor_esperado)), 0) AS total
        FROM Parcela p
        JOIN Emprestimo e ON p.id_emprestimo = e.id_emprestimo
        WHERE DATE(p.data_pagamento) >= $1
        AND (LOWER(p.status_parcela) IN ('pago', 'paga') OR p.data_pagamento IS NOT NULL)
        AND e.id_usuario = $2
        GROUP BY p.data_pagamento
        ORDER BY p.data_pagamento
      `;
      const seteDiasAtras = new Date(dataAtual);
      seteDiasAtras.setDate(dataAtual.getDate() - 7);
      const resReceitasPorDia = await database.query(queryReceitasPorDia, [
        formatarDataISO(seteDiasAtras),
        id_usuario,
      ]);

      const queryIndicadores = `
        SELECT 
            COUNT(*) AS totalEmprestimos,
            COALESCE(SUM(e.valor_emprestimo), 0) AS valorTotalEmprestimos,
            COUNT(DISTINCT e.id_cliente) AS totalClientes
        FROM Emprestimo e
        WHERE e.status_emprestimo = TRUE AND e.id_usuario = $1
      `;
      const resIndicadores = await database.query(queryIndicadores, [id_usuario]);

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

  static async obterIndicadoresFinanceiros(id_usuario: number): Promise<any> {
    try {
      const dataAtual = new Date();
      const dataAtualStr = formatarDataISO(dataAtual);

      const queryIndicadores = `
        SELECT 
            COUNT(*) AS totalEmprestimos,
            COALESCE(SUM(e.valor_emprestimo), 0) AS valorTotalEmprestimos,
            COUNT(DISTINCT e.id_cliente) AS totalClientes,
            COALESCE(SUM(CASE WHEN e.status_emprestimo = TRUE THEN 1 ELSE 0 END), 0) AS emprestimosAtivos,
            COALESCE(SUM(CASE WHEN e.status_emprestimo = FALSE THEN 1 ELSE 0 END), 0) AS emprestimosConcluidos
        FROM Emprestimo e
        WHERE e.id_usuario = $1
      `;
      const resIndicadores = await database.query(queryIndicadores, [id_usuario]);

      const queryInadimplencia = `
        SELECT 
            COUNT(*) AS totalParcelas,
            COALESCE(SUM(CASE WHEN (LOWER(p.status_parcela) IN ('pendente', 'atrasada', 'atrasado') OR p.data_pagamento IS NULL) AND DATE(p.data_vencimento) < $1 THEN 1 ELSE 0 END), 0) AS parcelasAtrasadas
        FROM Parcela p
        JOIN Emprestimo e ON p.id_emprestimo = e.id_emprestimo
        WHERE e.id_usuario = $2
      `;
      const resInadimplencia = await database.query(queryInadimplencia, [
        dataAtualStr,
        id_usuario,
      ]);
      const totalParcelas = Number(
        resInadimplencia.rows[0]?.totalparcelas || 1,
      );
      const parcelasAtrasadas = Number(
        resInadimplencia.rows[0]?.parcelasatrasadas || 0,
      );
      const taxaInadimplencia = (parcelasAtrasadas / totalParcelas) * 100;

      const queryRentabilidade = `
        SELECT 
            COALESCE(AVG((e.valor_parcela * e.num_parcelas) - e.valor_emprestimo), 0) AS rentabilidadeMedia
        FROM Emprestimo e
        WHERE e.status_emprestimo = TRUE AND e.id_usuario = $1
      `;
      const resRentabilidade = await database.query(queryRentabilidade, [id_usuario]);
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