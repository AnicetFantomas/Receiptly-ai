import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ExtractionError,
  NotAReceiptError,
} from '../extract/extract.service';

/**
 * Central error mapping so clients get sensible HTTP responses instead of raw
 * 500s with stack traces:
 *   - HttpException (incl. validation 400s, 404s) → passed through untouched
 *   - NotAReceiptError (image isn't a receipt)     → 422
 *   - ExtractionError (OpenAI refused/unreachable) → 502
 *   - anything else (e.g. DB failure)             → 500 with a generic message
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    if (res.headersSent) return;

    if (exception instanceof HttpException) {
      res.status(exception.getStatus()).json(exception.getResponse());
      return;
    }

    // Not an error condition — the image just isn't a receipt. The user sees
    // the model's own description of what it saw.
    if (exception instanceof NotAReceiptError) {
      res.status(422).json({
        statusCode: 422,
        message: exception.message,
        error: 'Unprocessable Entity',
      });
      return;
    }

    if (exception instanceof ExtractionError) {
      this.logger.error(exception.message);
      res.status(502).json({
        statusCode: 502,
        message: exception.message,
        error: 'Bad Gateway',
      });
      return;
    }

    this.logger.error(
      `Unhandled error: ${(exception as Error)?.message ?? exception}`,
      (exception as Error)?.stack,
    );
    res.status(500).json({
      statusCode: 500,
      message: 'Something went wrong. Please try again.',
      error: 'Internal Server Error',
    });
  }
}
