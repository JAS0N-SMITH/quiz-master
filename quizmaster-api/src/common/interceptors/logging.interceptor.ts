import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, ip } = request;
    const userAgent = request.get('user-agent') || '';
    const userId = request.user?.id || 'anonymous';

    const now = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse();
          const { statusCode } = response;
          const contentLength = response.get('content-length');

          this.logger.log(
            `${method} ${url} ${statusCode} ${contentLength || '-'} - ${Date.now() - now}ms - ${userId} - ${ip} - ${userAgent}`,
          );
        },
        error: (error) => {
          const status = error.status || 500;
          this.logger.error(
            `${method} ${url} ${status} - ${Date.now() - now}ms - ${userId} - ${ip} - ${error.message}`,
          );
        },
      }),
    );
  }
}
