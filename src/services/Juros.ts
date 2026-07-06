class Juros {
  /**
   * Calcula juros simples
   * @param valorEmprestimo - Valor principal do emprestimo
   * @param taxaJuros - Taxa de juros em percentual (ex: 5 para 5%)
   * @param parcelas - Numero de parcelas
   * @returns Objeto com jurosTotal, valorFinal e valorParcela
   */
  calcularSimples(
    valorEmprestimo: number,
    taxaJuros: number,
    parcelas: number
  ) {
    const jurosTotal = valorEmprestimo * (taxaJuros / 100) * parcelas;
    const valorFinal = valorEmprestimo + jurosTotal;
    const valorParcela = valorFinal / parcelas;

    return {
      jurosTotal,
      valorFinal,
      valorParcela,
    };
  }

  /**
   * Calcula juros compostos
   * @param valorEmprestimo - Valor principal do emprestimo
   * @param taxaJuros - Taxa de juros em percentual (ex: 5 para 5%)
   * @param parcelas - Numero de parcelas
   * @returns Objeto com jurosTotal, valorFinal e valorParcela
   */
  calcularCompostos(
    valorEmprestimo: number,
    taxaJuros: number,
    parcelas: number
  ) {
    const valorFinal = valorEmprestimo * Math.pow(1 + taxaJuros / 100, parcelas);
    const jurosTotal = valorFinal - valorEmprestimo;
    const valorParcela = valorFinal / parcelas;

    return {
      jurosTotal,
      valorFinal,
      valorParcela,
    };
  }

  /**
   * Calcula o valor da parcela com ajuste da ultima parcela
   * @param valorEmprestimo - Valor principal do emprestimo
   * @param taxaJuros - Taxa de juros em percentual (ex: 5 para 5%)
   * @param parcelas - Numero de parcelas
   * @param tipoJuros - 'simples' ou 'compostos'
   * @returns Objeto com valorParcelaBase, ultimaParcela e montante
   */
  calcularParcelas(
    valorEmprestimo: number,
    taxaJuros: number,
    parcelas: number,
    tipoJuros: 'simples' | 'compostos'
  ) {
    const resultado = tipoJuros === 'simples'
      ? this.calcularSimples(valorEmprestimo, taxaJuros, parcelas)
      : this.calcularCompostos(valorEmprestimo, taxaJuros, parcelas);

    const valorParcelaBase = Number((resultado.valorParcela).toFixed(2));
    const somaParcelas = valorParcelaBase * (parcelas - 1);
    const ultimaParcela = Number((resultado.valorFinal - somaParcelas).toFixed(2));

    return {
      ...resultado,
      valorParcelaBase,
      ultimaParcela: ultimaParcela > 0 ? ultimaParcela : valorParcelaBase,
    };
  }
}

export default new Juros();