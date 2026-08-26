export default interface EmprestimoDTO {
  id_emprestimo?: number | undefined;
  id_usuario?: number | undefined;
  id_cliente: number;
  nome_cliente?: string | undefined;
  sobrenome_cliente?: string | undefined;
  valor_emprestimo: number;
  num_parcelas: number;
  valor_parcela?: number | undefined;
  tipo_juros: string;
  juros: number;
  data_emprestimo: Date;
  data_devolucao?: Date | undefined;
  status_emprestimo?: boolean | undefined;
  forma_pagamento?: string | undefined;
}