import Juros from './Juros.js';

export default class CalculadoraFinanceira {
  /**
   * Calcula o valor da parcela com base no tipo de juros
   * @param valorTotal - Valor total do emprestimo
   * @param numParcelas - Numero de parcelas
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
      throw new Error('Numero de parcelas deve ser maior que zero.');
    }

    if (juros === 0) {
      return valorTotal / numParcelas;
    }

    const resultado = Juros.calcularParcelas(valorTotal, juros, numParcelas, tipoJuros);
    return resultado.valorParcelaBase;
  }

  /**
   * Ajusta o valor da ultima parcela para fechar o valor total exato
   * @param valorTotal - Valor total do emprestimo
   * @param valorParcelaBase - Valor base da parcela (ja arredondado)
   * @param numParcelas - Numero total de parcelas
   * @param juros - Taxa de juros em percentual
   * @param tipoJuros - 'simples' ou 'compostos'
   * @returns Valor ajustado para a ultima parcela
   */
  static ajustarUltimaParcela(
    valorTotal: number,
    valorParcelaBase: number,
    numParcelas: number,
    juros: number,
    tipoJuros: 'simples' | 'compostos'
  ): number {
    const resultado = Juros.calcularParcelas(valorTotal, juros, numParcelas, tipoJuros);
    return resultado.ultimaParcela;
  }

  /**
   * Verifica se a soma das parcelas esta dentro da margem de erro (tolerancia para arredondamentos)
   */
  static validarSomaParcelas(
    valorTotal: number,
    valorParcela: number,
    numParcelas: number,
    margemErro: number = 1.00
  ): { valido: boolean; diferenca: number; sugestao?: number } {
    const somaEsperada = valorTotal;
    const somaAtual = valorParcela * numParcelas;
    const diferenca = Math.abs(somaEsperada - somaAtual);

    if (diferenca <= margemErro) {
      return { valido: true, diferenca };
    }

    const sugestao = Math.round((somaEsperada / numParcelas) * 100) / 100;

    return {
      valido: false,
      diferenca,
      sugestao
    };
  }
}