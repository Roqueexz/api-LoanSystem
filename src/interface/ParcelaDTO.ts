// interface/ParcelaDTO.ts
export default interface ParcelaDTO {
  id_parcela: number;

  id_emprestimo: number;

  numero_parcela: number;

  valor_parcela: number;

  data_vencimento: string;

  data_pagamento?: string | null;

  status_parcela: "PAGA" | "PENDENTE" | "ATRASADA";
}