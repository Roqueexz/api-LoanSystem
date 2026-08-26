import { z } from 'zod';

const RecorrenciaEnum = z.enum([
  'unica',
  'diaria',
  'semanal',
  'quinzenal',
  'mensal',
  'bimestral',
  'trimestral',
  'semestral',
  'anual',
]);

const PrioridadeEnum = z.enum(['alta', 'media', 'baixa']);

export const ContaSchema = z.object({
  tipo: z.enum(['pagar', 'receber']),
  descricao: z.string().min(1, 'Descrição é obrigatória').max(255, 'Descrição muito longa'),
  valor: z.number().positive('Valor deve ser maior que zero'),
  vencimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Vencimento deve ser no formato YYYY-MM-DD'),

  // Sprint 6 fields
  categoria: z.string().min(1).max(100).optional(),
  recorrencia: RecorrenciaEnum.optional(),
  prioridade: PrioridadeEnum.optional(),
  lembrete_dias_antes: z.number().int().min(0).optional(),
  observacao: z.string().max(1000).optional(),
  tags: z.array(z.string().min(1).max(30)).max(5).optional(),
  status: z.enum(['programada', 'pendente', 'paga', 'atrasada', 'cancelada']).optional(),
});

export type ContaInput = z.infer<typeof ContaSchema>;
