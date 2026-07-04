import { type Request, type Response, type NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';

export const validate = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((err) => ({
          campo: err.path.join('.'),
          mensagem: err.message,
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