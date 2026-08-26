import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().email("Email invalido"),
  senha: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
});

export type LoginInput = z.infer<typeof LoginSchema>;