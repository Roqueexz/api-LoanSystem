import { z } from 'zod';

export const EmprestimoSchema = z.object({
  id_cliente: z.number().int().positive("ID do cliente invalido"),
  valor_emprestimo: z.number().positive("Valor do emprestimo deve ser maior que 0"),
  num_parcelas: z.number().int().min(1, "Numero de parcelas deve ser pelo menos 1"),
  valor_parcela: z.number().positive().optional(),
  tipo_juros: z.enum(['simples', 'compostos']),
  juros: z.number().min(0, "Juros nao pode ser negativo"),
  data_emprestimo: z.string().transform((str) => new Date(str)),
  data_devolucao: z.string().transform((str) => new Date(str)).optional(),
  forma_pagamento: z.string().optional(),
});

export type EmprestimoInput = z.infer<typeof EmprestimoSchema>;