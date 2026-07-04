export default interface CaixaDTO {
    totalEmprestado: number;    // Total emprestado (ativos)
    totalRecebido: number;      // Total recebido (parcelas pagas)
    entradaPendente: number;    // Total a receber (parcelas pendentes + atrasadas)
    lucroPrevisto: number;      // Lucro previsto (juros futuros)
}