export default interface EmprestimoDTO {
    id_emprestimo: number; 
cliente: {  
    id_cliente: number;
    nome_cliente: string;
    sobrenome_cliente: string;
}
    valor_emprestimo: number;
    num_parcelas: number;
    valor_parcela: number;
    juros: number;
    data_emprestimo: Date;
    data_devolucao?: Date;
    status_emprestimo?: boolean;
} 