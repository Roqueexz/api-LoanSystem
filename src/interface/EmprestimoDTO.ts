export default interface EmprestimoDTO {
    id_emprestimo?: number;
    id_cliente: number;
    nome_cliente?: string;       // Adicionado para o SELECT JOIN
    sobrenome_cliente?: string;  // Adicionado para o SELECT JOIN
    valor_emprestimo: number;
    num_parcelas: number;
    valor_parcela: number;
    tipo_juros: string;          // Obrigatório no banco
    juros: number;
    data_emprestimo: Date;
    data_devolucao?: Date;
    status_emprestimo?: boolean;
}