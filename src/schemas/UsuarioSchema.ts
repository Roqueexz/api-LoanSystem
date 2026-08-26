import { z } from 'zod';

export const AtualizarPerfilSchema = z.object({
  nome: z
    .string()
    .min(2, 'Nome deve ter ao menos 2 caracteres.')
    .max(80, 'Nome muito longo.')
    .optional(),
  email: z
    .string()
    .email('E-mail inválido.')
    .optional(),
}).refine((data) => data.nome || data.email, {
  message: 'Informe ao menos nome ou e-mail para atualizar.',
});

export const AlterarSenhaSchema = z.object({
  senhaAtual: z
    .string()
    .min(6, 'Senha atual deve ter ao menos 6 caracteres.'),
  novaSenha: z
    .string()
    .min(6, 'Nova senha deve ter ao menos 6 caracteres.')
    .max(100, 'Senha muito longa.'),
  confirmacaoSenha: z
    .string()
    .min(6, 'Confirmação deve ter ao menos 6 caracteres.'),
}).refine((data) => data.novaSenha === data.confirmacaoSenha, {
  message: 'Nova senha e confirmação não coincidem.',
  path: ['confirmacaoSenha'],
});
