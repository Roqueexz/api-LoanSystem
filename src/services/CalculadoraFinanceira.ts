export default class CalculadoraFinanceira {
  /**
   * Calcula o valor da parcela com base no tipo de juros
   * @param valorTotal - Valor total do empréstimo
   * @param numParcelas - Número de parcelas
   * @param juros - Taxa de juros em percentual (ex: 1.5 = 1.5%)
   * @param tipoJuros - 'simples' ou 'compostos'
   * @returns Valor da parcela (sem arredondamento)
   */
  static calcularValorParcela(
    valorTotal: number,
    numParcelas: number,
    juros: number,
    tipoJuros: 'simples' | 'compostos'
  ): number {
    if (numParcelas <= 0) {
      throw new Error('Número de parcelas deve ser maior que zero.');
    }

    const taxa = juros / 100;

    if (tipoJuros === 'simples') {
      // Juros simples: M = C * (1 + i * n)
      const montante = valorTotal * (1 + taxa * numParcelas);
      return montante / numParcelas;
    } else {
      // Juros compostos: M = C * (1 + i)^n
      const montante = valorTotal * Math.pow(1 + taxa, numParcelas);
      return montante / numParcelas;
    }
  }

  /**
   * Ajusta o valor da última parcela para fechar o valor total exato
   * @param valorTotal - Valor total do empréstimo
   * @param valorParcelaBase - Valor base da parcela (já arredondado)
   * @param numParcelas - Número total de parcelas
   * @returns Valor ajustado para a última parcela
   */
  static ajustarUltimaParcela(
    valorTotal: number,
    valorParcelaBase: number,
    numParcelas: number
  ): number {
    const somaParcelas = valorParcelaBase * (numParcelas - 1);
    const residual = valorTotal - somaParcelas;

    // Se o residual for muito pequeno (centavos), arredonda para 2 casas
    // Senão, mantém o valor calculado
    return Math.round(residual * 100) / 100;
  }

  /**
   * Verifica se a soma das parcelas está dentro da margem de erro (1 centavo)
   */
  static validarSomaParcelas(
    valorTotal: number,
    valorParcela: number,
    numParcelas: number,
    margemErro: number = 0.01
  ): { valido: boolean; diferenca: number; sugestao?: number } {
    const somaEsperada = valorTotal;
    const somaAtual = valorParcela * numParcelas;
    const diferenca = Math.abs(somaEsperada - somaAtual);

    if (diferenca <= margemErro) {
      return { valido: true, diferenca };
    }

    // Sugere um novo valor para a parcela
    const sugestao = Math.round((somaEsperada / numParcelas) * 100) / 100;

    return {
      valido: false,
      diferenca,
      sugestao
    };
  }
}