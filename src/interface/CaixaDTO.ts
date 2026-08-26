export default interface CaixaDTO {
    // Resumo geral
    totalEmprestado: number;
    totalRecebido: number;
    entradaPendente: number;
    lucroPrevisto: number;
    totalClientes: number;
    totalEmprestimos: number;
    totalAtrasado: number;

    // Relatórios por período
    relatorioDiario?: {
        data: string;
        recebido: number;
        emprestado: number;
        parcelasVencendo: number;
        parcelasAtrasadas: number;
    };

    relatorioMensal?: {
        mes: string;
        recebido: number;
        emprestado: number;
        crescimento: number; // % comparado ao mês anterior
    }[];

    relatorioAnual?: {
        ano: string;
        totalRecebido: number;
        totalEmprestado: number;
        lucro: number;
    }[];
}