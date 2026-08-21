import CaixaPessoal from "../model/CaixaPessoal.js";
import logger from "./Logger.js";

export default class SaldoService {
  /**
   * Recalcula o saldo total (cofre + entradas - saídas) e persiste na tabela caixa_pessoal.
   * Disparado automaticamente após qualquer movimentação financeira no sistema.
   */
  static async recalcularESalvarSaldo(id_usuario: number): Promise<number> {
    try {
      const cofre = await CaixaPessoal.obterCofre(id_usuario);
      const movimentacoes = await CaixaPessoal.listarMovimentacoes(id_usuario);

      const entradas = movimentacoes
        .filter((m) => m.tipo === "entrada")
        .reduce((acc, m) => acc + Number(m.valor || 0), 0);

      const saidas = movimentacoes
        .filter((m) => m.tipo === "saida")
        .reduce((acc, m) => acc + Number(m.valor || 0), 0);

      const novoSaldo = Number(cofre.total || 0) + entradas - saidas;

      await CaixaPessoal.atualizarSaldo(id_usuario, novoSaldo);

      logger.info(
        { id_usuario, novoSaldo, totalCofre: cofre.total, entradas, saidas },
        "[SaldoService] Saldo recalculado e sincronizado com sucesso",
      );

      return novoSaldo;
    } catch (error) {
      logger.error(
        { error, id_usuario },
        "[SaldoService] Erro ao recalcular e salvar saldo",
      );
      throw error;
    }
  }
}
