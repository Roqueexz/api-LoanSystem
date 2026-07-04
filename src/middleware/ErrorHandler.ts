// ErrorHandler.ts
import { type Request, type Response, type NextFunction } from 'express';
import { ZodError } from 'zod';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (err instanceof ZodError) {
    const errors = err.issues.map((issue) => ({
      campo: issue.path.join('.'),
      mensagem: issue.message,
    }));
    res.status(400).json({ 
      mensagem: "Dados invalidos", 
      errors 
    });
    return;
  }

  console.error('[ErrorHandler]', err);
  res.status(500).json({ mensagem: "Erro interno do servidor" });
};