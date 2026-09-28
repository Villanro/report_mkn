/** Error de infraestructura: ORDS no respondió o respondió con error. Se traduce a 502 en el error handler central. */
export class OrdsUnavailableError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "OrdsUnavailableError";
  }
}
