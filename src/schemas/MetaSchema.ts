import { z } from 'zod';

const dataISORegex = /^\d{4}-\d{2}-\d{2}$/;

export const MetaSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').max(120, 'Nome muito longo'),
  descricao: z.string().max(255, 'Descrição muito longa').optional(),
  valor_alvo: z.number().positive('Valor alvo deve ser maior que zero').optional(),
  valorAlvo: z.number().positive('Valor alvo deve ser maior que zero').optional(),
  valor_atual: z.number().min(0, 'Valor atual não pode ser negativo').optional(),
  valorAtual: z.number().min(0, 'Valor atual não pode ser negativo').optional(),
  prazo: z.string().regex(dataISORegex, 'Prazo deve ser no formato YYYY-MM-DD').optional(),
}).refine((dados) => dados.valor_alvo !== undefined || dados.valorAlvo !== undefined, {
  message: 'Valor alvo deve ser informado e ser maior que zero.',
  path: ['valor_alvo'],
});

export const MetaUpdateSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').max(120, 'Nome muito longo').optional(),
  descricao: z.string().max(255, 'Descrição muito longa').optional(),
  valor_alvo: z.number().positive('Valor alvo deve ser maior que zero').optional(),
  valorAlvo: z.number().positive('Valor alvo deve ser maior que zero').optional(),
  valor_atual: z.number().min(0, 'Valor atual não pode ser negativo').optional(),
  valorAtual: z.number().min(0, 'Valor atual não pode ser negativo').optional(),
  prazo: z.string().regex(dataISORegex, 'Prazo deve ser no formato YYYY-MM-DD').optional(),
}).refine((dados) => Object.keys(dados).length > 0, {
  message: 'É necessário informar ao menos um campo para atualização.',
});

