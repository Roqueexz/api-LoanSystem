import { z } from 'zod';

export const CaixinhaSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(80, 'Nome muito longo'),
  meta: z.number().positive('Meta deve ser maior que zero').optional().nullable(),
  emoji: z.string().max(10, 'Emoji muito longo').optional(),
  cor: z.string().max(60, 'Cor muito longa').optional(),
});

export const ValorCaixinhaSchema = z.object({
  valor: z.number().positive('Valor deve ser maior que zero'),
});

export type CaixinhaInput = z.infer<typeof CaixinhaSchema>;
export type ValorCaixinhaInput = z.infer<typeof ValorCaixinhaSchema>;
