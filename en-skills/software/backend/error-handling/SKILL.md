---
name: error-handling
description: >
  Use this skill when implementing error handling in a Node.js backend.
  Covers custom error classes, NestJS exception filters, Express error
  handler, operational vs programming errors, graceful shutdown, and
  consistent error response formatting.
---

# Error Handling — Error Management

## Agent workflow

**1.** Create custom error classes extending `AppError` (section 2).
**2.** Implement global error handler / exception filter (sections 3–4).
**3.** Configure unhandled rejections and graceful shutdown (sections 5–6).
**4.** Wrap external service errors (section 7).
**5.** Check against the gotchas list (section 8).

## 1. Types of Errors

**Operational (expected, recoverable):**
Invalid input (400), not authenticated (401), no permissions (403), resource not found (404), conflict/duplicate (409), rate limit (429), external service down (502/503). Handled with catch, handler, retry, or fallback. Communicated to client with code and descriptive message.

**Programming (bugs, should not happen):**
TypeError, ReferenceError, null pointer access, missing env variable at runtime. Logged as critical/error. Communicated to client as generic 500 (**never** expose details). Fixed in code.

## 2. Custom Error Classes

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
    return true; // All AppErrors are operational
  }
}

// Specific errors
export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const msg = id ? `${resource} with ID ${id} not found` : `${resource} not found`;
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
    super(400, 'VALIDATION_ERROR', 'The submitted data is not valid', { details });
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Not authenticated') {
    super(401, 'UNAUTHORIZED', message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission for this action') {
    super(403, 'FORBIDDEN', message);
  }
}
```

## 3. Express — Global Error Handler

```typescript
// MUST be the LAST middleware registered
// MUST have 4 parameters (err, req, res, next) → Express recognizes it as error handler

function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  // Operational error (AppError)
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

  // Zod error (validation)
  if (err.name === 'ZodError') {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid data',
        details: err.issues,
        requestId: req.requestId,
      },
    });
  }

  // Programming error (bug)
  logger.error({
    message: err.message,
    stack: err.stack,
    requestId: req.requestId,
    path: req.originalUrl,
    method: req.method,
  });

  // NEVER expose the stack trace or internal message to the client
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
      requestId: req.requestId,
    },
  });
}

// Registration
app.use(errorHandler);
```

## 4. NestJS — Global Exception Filter

```typescript
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: Logger) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = request['requestId'];

    // NestJS HttpException (includes BadRequestException, etc.)
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

    // Custom AppError
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

    // Unexpected error (bug)
    this.logger.error({
      message: exception instanceof Error ? exception.message : 'Unknown error',
      stack: exception instanceof Error ? exception.stack : undefined,
      requestId,
      path: request.url,
    });

    response.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
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

## 5. Unhandled Rejections and Uncaught Exceptions

```typescript
// In the entry point (main.ts / index.ts)
// Catch errors that escape all handling

process.on('unhandledRejection', (reason: unknown) => {
  logger.fatal({ message: 'Unhandled Rejection', reason });
  // Let the process crash handler take care of it
  throw reason;
});

process.on('uncaughtException', (error: Error) => {
  logger.fatal({ message: 'Uncaught Exception', error: error.message, stack: error.stack });
  // Graceful shutdown: close connections, then exit
  gracefulShutdown().then(() => process.exit(1));
});
```

## 6. Graceful Shutdown

```typescript
async function gracefulShutdown() {
  logger.info('Initiating graceful shutdown...');

  // 1. Stop accepting new connections
  server.close();

  // 2. Wait for in-flight requests (timeout 10s)
  await new Promise((resolve) => setTimeout(resolve, 10_000));

  // 3. Close DB connections
  await prisma.$disconnect();

  // 4. Close Redis connections
  await redis.quit();

  // 5. Close BullMQ workers
  await worker.close();

  logger.info('Graceful shutdown complete');
}

// Termination signals
const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT'];
for (const signal of signals) {
  process.on(signal, async () => {
    logger.info(`Received ${signal}`);
    await gracefulShutdown();
    process.exit(0);
  });
}
```

## 7. External Service Errors

```typescript
// Wrapping external service errors
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

    // Convert to operational error with context
    throw new AppError(
      502,
      'EXTERNAL_SERVICE_ERROR',
      `Service ${name} is unavailable`,
    );
  }
}

// Usage
const paymentResult = await callExternalService('Stripe', () =>
  stripe.charges.create({ amount: 1000, currency: 'usd' }),
);
```

## 8. Gotchas

- try/catch in every controller — use global exception filter/error handler.
- `throw new Error('message')` generic — use `AppError` with code and status.
- Expose stack trace to client in production — only `INTERNAL_ERROR`.
- Silence errors with empty catch — log at minimum.
- Return 200 with `{ success: false }` — use HTTP status codes.
- Different error formats across endpoints — consistent format.
- Not handling `unhandledRejection` — the process dies without logs.
- `process.exit(1)` without graceful shutdown — in-flight requests are lost.
- Throwing strings: `throw 'error'` — always `throw new Error/AppError`.
- Mixing operational and programming errors — treat them differently.

## 9. Related Skills

| Skill | Why |
|-------|-----|
| `logging` | Structured error logging, NO PII in messages |
| `testing` | Tests for error paths (not just happy path) |
| `security` | Don't expose stack traces in production |
| `api-design` | Status codes and consistent error response format |
| `frontend/error-handling-rules` | Error format that the frontend consumes |
