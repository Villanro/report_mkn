import type { NextFunction, Request, RequestHandler, Response } from "express";

/**
 * Express 4 no atrapa rechazos de promesas devueltas por un handler async: si no se
 * capturan, escapan como unhandled rejection y tumban el proceso entero (no solo la
 * request). Este wrapper reenvía cualquier error a `next()` para que lo resuelva el
 * error handler central (ver app.ts) en vez de crashear el servidor.
 */
export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
}
