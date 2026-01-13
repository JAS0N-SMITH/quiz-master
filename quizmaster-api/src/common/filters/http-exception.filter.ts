import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error: string | undefined = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object') {
        // Preserve full response object in message for richer error details
        message = exceptionResponse as any;
        error = (exceptionResponse as any).error;
      } else {
        message = exceptionResponse;
      }
    } else if (exception instanceof Error) {
      // Keep generic message for unexpected errors, but log details
      this.logger.error(
        `Unexpected error: ${exception.message}`,
        exception.stack,
      );
    }

    // Don't expose internal error details in production
    if (process.env.NODE_ENV === 'production' && status === 500) {
      message = 'An unexpected error occurred';
    }

    const body: Record<string, unknown> = {
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    };
    if (error) {
      body.error = error;
    }
    response.status(status).json(body);
  }
}
