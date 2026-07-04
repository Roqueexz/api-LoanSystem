export default interface EmprestimoDTO {
  id_emprestimo?: number;
  id_cliente: number;
  nome_cliente?: string;
  sobrenome_cliente?: string;
  valor_emprestimo: number;
  num_parcelas: number;
  valor_parcela?: number;
  tipo_juros: string;
  juros: number;
  data_emprestimo: Date;
  data_devolucao?: Date;
  status_emprestimo?: boolean;
  forma_pagamento?: string;
}