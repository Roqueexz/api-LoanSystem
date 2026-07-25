import { z } from 'zod';

export const ContaSchema = z.object({
  tipo: z.enum(['pagar', 'receber']),
  descricao: z.string().min(1, 'Descrição é obrigatória').max(255, 'Descrição muito longa'),
  valor: z.number().positive('Valor deve ser maior que zero'),
  vencimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Vencimento deve ser no formato YYYY-MM-DD'),
});

export type ContaInput = z.infer<typeof ContaSchema>;
