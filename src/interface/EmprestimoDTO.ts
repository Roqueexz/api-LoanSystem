export default interface EmprestimoDTO {
    id_emprestimo?: number;
    id_cliente: number;
    valor_emprestimo: number;
    num_parcelas: number;
    valor_parcela: number;
    tipo_juros: string;
    juros: number;
    data_emprestimo: Date;
    data_devolucao?: Date;
    status_emprestimo?: boolean;
}