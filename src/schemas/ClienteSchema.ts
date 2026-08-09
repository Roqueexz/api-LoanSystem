import { z } from 'zod';

export const ClienteSchema = z.object({
  // Aceita tanto nome/sobrenome quanto nome_cliente/sobrenome_cliente
  nome: z.string().min(2, "Nome precisa ter pelo menos 2 caracteres").max(80, "Nome muito longo").optional(),
  nome_cliente: z.string().min(2, "Nome precisa ter pelo menos 2 caracteres").max(80, "Nome muito longo").optional(),
  sobrenome: z.string().min(2, "Sobrenome precisa ter pelo menos 2 caracteres").max(100, "Sobrenome muito longo").optional(),
  sobrenome_cliente: z.string().min(2, "Sobrenome precisa ter pelo menos 2 caracteres").max(100, "Sobrenome muito longo").optional(),
  // Telefone pode vir formatado ex: (11) 99999-9999 — validamos apenas os dígitos
  telefone: z.string().transform((val) => val.replace(/\D/g, '')).pipe(
    z.string().min(10, "Telefone deve ter pelo menos 10 dígitos").max(11, "Telefone deve ter no máximo 11 dígitos")
  ),
  cidade: z.string().min(2, "Cidade precisa ter pelo menos 2 caracteres").max(100, "Cidade muito longa"),
  estado: z.string().length(2, "Estado deve ter 2 caracteres (ex: SP)").toUpperCase(),
  status_cliente: z.boolean().optional(),
}).refine(
  (data) => {
    const nome = (data.nome_cliente || data.nome || '').trim();
    return nome.length >= 2;
  },
  { message: "Nome do cliente precisa ter pelo menos 2 caracteres", path: ["nome_cliente"] }
).refine(
  (data) => {
    const sobrenome = (data.sobrenome_cliente || data.sobrenome || '').trim();
    return sobrenome.length >= 2;
  },
  { message: "Sobrenome do cliente precisa ter pelo menos 2 caracteres", path: ["sobrenome_cliente"] }
);

export type ClienteInput = z.infer<typeof ClienteSchema>;