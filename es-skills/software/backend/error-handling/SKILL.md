---
name: error-handling
description: >
  Manejo de errores en backend Node.js. Cubre error classes custom,
  exception filters NestJS, error handler express, diferencia entre
  errores operacionales y de programación, graceful shutdown,
  y formato consistente de error responses.
---

# 💥 Error Handling — Manejo de Errores

## Principio

> **Los errores son ciudadanos de primera clase.**
> Un error bien manejado es invisible para el usuario y visible para el dev.
> Un error mal manejado es visible para el usuario e invisible para el dev.

---

## Tipos de Errores

```
OPERACIONALES (esperados, recuperables):
  - Input inválido → 400
  - No autenticado → 401
  - Sin permisos → 403
  - Recurso no encontrado → 404
  - Conflicto (duplicate) → 409
  - Rate limit → 429
  - Servicio externo caído → 502/503
  
  → SE MANEJAN: catch, handler, retry, fallback
  → SE COMUNICAN al cliente con código y mensaje descriptivo

PROGRAMACIÓN (bugs, no deberían pasar):
  - TypeError, ReferenceError
  - Null pointer access
  - Array index out of bounds
  - Missing env variable en runtime
  
  → SE LOGUEAN como critical/error
  → SE COMUNICAN al cliente como 500 genérico (NUNCA exponer detalle)
  → SE ARREGLAN en código
```

---

## Error Classes Custom

```typescript
// Base error class
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }

  get isOperational(): boolean {
    return true; // Todos los AppError son operacionales
  }
}

// Errores específicos
export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const msg = id ? `${resource} con ID ${id} no encontrado` : `${resource} no encontrado`;
    super(404, 'NOT_FOUND', msg);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, 'CONFLICT', message);
  }
}

export class ValidationError extends AppError {
  constructor(details: Array<{ field: string; message: string }>) {
    super(400, 'VALIDATION_ERROR', 'Los datos enviados no son válidos', { details });
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'No autenticado') {
    super(401, 'UNAUTHORIZED', message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'No tienes permisos para esta acción') {
    super(403, 'FORBIDDEN', message);
  }
}
```

---

## Express — Global Error Handler

```typescript
// DEBE ser el ÚLTIMO middleware registrado
// DEBE tener 4 parámetros (err, req, res, next) → Express lo reconoce como error handler

function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  // Error operacional (AppError)
  if (err instanceof AppError) {
    logger.warn({
      code: err.code,
      message: err.message,
      statusCode: err.statusCode,
      requestId: req.requestId,
      path: req.originalUrl,
    });

    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details && { details: err.details }),
        requestId: req.requestId,
      },
    });
  }

  // Error de Zod (validación)
  if (err.name === 'ZodError') {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Datos inválidos',
        details: err.issues,
        requestId: req.requestId,
      },
    });
  }

  // Error de programación (bug)
  logger.error({
    message: err.message,
    stack: err.stack,
    requestId: req.requestId,
    path: req.originalUrl,
    method: req.method,
  });

  // NUNCA exponer el stack trace o mensaje interno al cliente
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Error interno del servidor',
      requestId: req.requestId,
    },
  });
}

// Registro
app.use(errorHandler);
```

---

## NestJS — Exception Filter Global

```typescript
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: Logger) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = request['requestId'];

    // HttpException de NestJS (incluye BadRequestException, etc.)
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      this.logger.warn({
        statusCode: status,
        message: exception.message,
        requestId,
        path: request.url,
      });

      return response.status(status).json({
        error: {
          code: this.getErrorCode(status),
          message: typeof exceptionResponse === 'string'
            ? exceptionResponse
            : (exceptionResponse as any).message,
          requestId,
        },
      });
    }

    // AppError custom
    if (exception instanceof AppError) {
      this.logger.warn({
        code: exception.code,
        message: exception.message,
        requestId,
      });

      return response.status(exception.statusCode).json({
        error: {
          code: exception.code,
          message: exception.message,
          ...(exception.details && { details: exception.details }),
          requestId,
        },
      });
    }

    // Error no esperado (bug)
    this.logger.error({
      message: exception instanceof Error ? exception.message : 'Unknown error',
      stack: exception instanceof Error ? exception.stack : undefined,
      requestId,
      path: request.url,
    });

    response.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Error interno del servidor',
        requestId,
      },
    });
  }

  private getErrorCode(status: number): string {
    const codes: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'TOO_MANY_REQUESTS',
    };
    return codes[status] || 'INTERNAL_ERROR';
  }
}
```

---

## Unhandled Rejections y Uncaught Exceptions

```typescript
// En el entry point (main.ts / index.ts)
// Capturar errores que se escapan de todo manejo

process.on('unhandledRejection', (reason: unknown) => {
  logger.fatal({ message: 'Unhandled Rejection', reason });
  // Dejar que el process crash handler se encargue
  throw reason;
});

process.on('uncaughtException', (error: Error) => {
  logger.fatal({ message: 'Uncaught Exception', error: error.message, stack: error.stack });
  // Graceful shutdown: cerrar conexiones, luego salir
  gracefulShutdown().then(() => process.exit(1));
});
```

---

## Graceful Shutdown

```typescript
async function gracefulShutdown() {
  logger.info('Initiating graceful shutdown...');

  // 1. Dejar de aceptar nuevas conexiones
  server.close();

  // 2. Esperar requests en vuelo (timeout 10s)
  await new Promise((resolve) => setTimeout(resolve, 10_000));

  // 3. Cerrar conexiones a DB
  await prisma.$disconnect();

  // 4. Cerrar conexiones a Redis
  await redis.quit();

  // 5. Cerrar workers de BullMQ
  await worker.close();

  logger.info('Graceful shutdown complete');
}

// Señales de terminación
const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT'];
for (const signal of signals) {
  process.on(signal, async () => {
    logger.info(`Received ${signal}`);
    await gracefulShutdown();
    process.exit(0);
  });
}
```

---

## Errores en Servicios Externos

```typescript
// Wrapping de errores de servicios externos
async function callExternalService<T>(
  name: string,
  fn: () => Promise<T>,
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    logger.error({
      message: `External service error: ${name}`,
      error: error instanceof Error ? error.message : 'Unknown',
    });

    // Convertir a error operacional con contexto
    throw new AppError(
      502,
      'EXTERNAL_SERVICE_ERROR',
      `El servicio ${name} no está disponible`,
    );
  }
}

// Uso
const paymentResult = await callExternalService('Stripe', () =>
  stripe.charges.create({ amount: 1000, currency: 'usd' }),
);
```

---

## Anti-patrones

```
❌ try/catch en cada controller → usar exception filter/error handler global
❌ throw new Error('message') genérico → usar AppError con code y status
❌ Exponer stack trace al cliente en producción → solo INTERNAL_ERROR
❌ Silenciar errores con catch vacío → loguear como mínimo
❌ Retornar 200 con { success: false } → usar HTTP status codes
❌ Distintos formatos de error en distintos endpoints → formato consistente
❌ No manejar unhandledRejection → el proceso muere sin logs
❌ process.exit(1) sin graceful shutdown → requests en vuelo se pierden
❌ Lanzar strings: throw 'error' → siempre throw new Error/AppError
❌ Mezclar errores operacionales y de programación → tratarlos distinto
```
