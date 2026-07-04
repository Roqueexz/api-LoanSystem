export default interface CaixaDTO {
    totalEmprestado: number;    // Total emprestado (soma de todos os emprestimos ativos)
    totalRecebido: number;      // Total recebido (soma de todas as parcelas pagas)
    entradaPendente: number;    // Total a receber (parcelas pendentes + atrasadas)
    lucroPrevisto: number;      // Lucro previsto (juros futuros)
    totalClientes: number;      // Quantidade de clientes ativos
    totalEmprestimos: number;   // Quantidade de emprestimos ativos
    totalAtrasado: number;      // Total em atraso (parcelas vencidas e nao pagas)
}