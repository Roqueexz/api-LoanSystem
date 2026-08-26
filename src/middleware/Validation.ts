// Validation.ts
import { type Request, type Response, type NextFunction } from 'express';
import { z, ZodError } from 'zod';

// Aceita ZodObject, ZodEffects (após .refine()/.transform()) e qualquer ZodType
export const validate = (schema: z.ZodTypeAny) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.issues.map((issue) => ({
          campo: issue.path.join('.'),
          mensagem: issue.message,
        }));
        const detalhe = errors.map((e) => e.mensagem).join("; ");
        res.status(400).json({
          mensagem: detalhe || "Dados inválidos",
          errors,
        });
        return;
      }
      res.status(500).json({ mensagem: "Erro interno ao validar dados" });
    }
  };
};