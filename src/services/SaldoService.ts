import CaixaPessoal from "../model/CaixaPessoal.js";
import logger from "./Logger.js";

export default class SaldoService {
  /**
   * Recalcula o saldo total (soma das Caixinhas + Cofre Físico) e persiste na tabela caixa_pessoal.
   * Não utiliza entradas e saídas de empréstimos no saldo.
   */
  static async recalcularESalvarSaldo(id_usuario: number): Promise<number> {
    try {
      const novoSaldo = await CaixaPessoal.obterSaldo(id_usuario);
      await CaixaPessoal.atualizarSaldo(id_usuario, novoSaldo);

      logger.info(
        { id_usuario, novoSaldo },
        "[SaldoService] Saldo consolidado das Caixinhas e Caixa Pessoal recalculado com sucesso",
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
