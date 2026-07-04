import { z } from 'zod';

export const ClienteSchema = z.object({
  nome: z.string().min(2, "Nome precisa ter pelo menos 2 caracteres").max(80, "Nome muito longo"),
  sobrenome: z.string().min(2, "Sobrenome precisa ter pelo menos 2 caracteres").max(100, "Sobrenome muito longo"),
  telefone: z.string().min(10, "Telefone invalido").max(20, "Telefone muito longo"),
  cidade: z.string().min(2, "Cidade precisa ter pelo menos 2 caracteres").max(100, "Cidade muito longa"),
  estado: z.string().length(2, "Estado deve ter 2 caracteres (ex: SP)"),
  status_cliente: z.boolean().optional(),
});

export type ClienteInput = z.infer<typeof ClienteSchema>;