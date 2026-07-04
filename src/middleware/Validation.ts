// Validation.ts
import { type Request, type Response, type NextFunction } from 'express';
import { z, ZodError } from 'zod';

export const validate = (schema: z.ZodObject<any, any>) => {
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
        res.status(400).json({
          mensagem: "Dados invalidos",
          errors,
        });
        return;
      }
      res.status(500).json({ mensagem: "Erro interno ao validar dados" });
    }
  };
};