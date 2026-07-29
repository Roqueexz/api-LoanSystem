import { z } from 'zod';

// Recorrência simples: nenhuma, diária, semanal, mensal, anual
const RecorrenciaEnum = z.enum(['nenhuma', 'diaria', 'semanal', 'mensal', 'anual']);

export const ContaSchema = z.object({
  tipo: z.enum(['pagar', 'receber']),
  descricao: z.string().min(1, 'Descrição é obrigatória').max(255, 'Descrição muito longa'),
  valor: z.number().positive('Valor deve ser maior que zero'),
  vencimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Vencimento deve ser no formato YYYY-MM-DD'),

  // Sprint 6 fields
  categoria: z.string().min(1).max(100).optional(),
  recorrencia: RecorrenciaEnum.optional(),
  lembrete_dias_antes: z.number().int().min(0).optional(),
  observacao: z.string().max(1000).optional(),
  status: z.enum(['pendente', 'paga', 'programada', 'cancelada']).optional(),
});

export type ContaInput = z.infer<typeof ContaSchema>;
