import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        // تغییر نام متغیر از response به httpResponse برای جلوگیری از تداخل
        const httpResponse = ctx.getResponse<Response>();

        let status = HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'Internal server error';

        if (exception instanceof HttpException) {
            status = exception.getStatus();
            const exceptionResponse = exception.getResponse();

            if (typeof exceptionResponse === 'string') {
                message = exceptionResponse;
            } else if (typeof exceptionResponse === 'object') {
                message = (exceptionResponse as any).message || (exceptionResponse as any).error;
            }
        } else if (exception instanceof Error) {
            message = exception.message;
        }

        // استفاده از httpResponse برای ارسال پاسخ
        httpResponse.status(status).json({
            statusCode: status,
            message: message,
        });
    }
}