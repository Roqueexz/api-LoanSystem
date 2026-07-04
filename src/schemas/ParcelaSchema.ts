import { z } from 'zod';

export const ParcelaSchema = z.object({
  id_emprestimo: z.number().int().positive(),
  numero_parcela: z.number().int().min(1),
  valor_esperado: z.number().positive(),
  data_vencimento: z.string().transform((str) => new Date(str)),
});

export type ParcelaInput = z.infer<typeof ParcelaSchema>;