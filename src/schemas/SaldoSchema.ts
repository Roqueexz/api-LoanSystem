import { z } from "zod";

export const SaldoSchema = z.object({
  saldo: z.number(),
});

export type SaldoInput = z.infer<typeof SaldoSchema>;
