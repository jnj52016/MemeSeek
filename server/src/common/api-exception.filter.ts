import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AiAnalysisError } from '../ai/ai-analysis.error';

type MulterErrorLike = { code?: string; message?: string };

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const request = context.getRequest<Request & { requestId?: string }>();
    const response = context.getResponse<Response>();
    const requestId = request.requestId ?? 'unknown';
    const multerError = exception as MulterErrorLike;
    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = '服务器暂时无法处理请求，请稍后重试。';
    let details: unknown = null;

    if (exception instanceof AiAnalysisError) {
      statusCode = exception.statusCode;
      code = exception.code;
      message = exception.message;
    } else if (multerError.code === 'LIMIT_FILE_SIZE') {
      statusCode = HttpStatus.PAYLOAD_TOO_LARGE;
      code = 'ANALYSIS_IMAGE_TOO_LARGE';
      message = '分析图片大小不能超过 10 MiB。';
    } else if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const body = exception.getResponse();
      const bodyRecord = typeof body === 'object' && body !== null ? body : {};
      const rawMessage = 'message' in bodyRecord ? bodyRecord.message : body;
      message = Array.isArray(rawMessage)
        ? rawMessage.map(String).join('；')
        : String(rawMessage);
      code = statusCode === HttpStatus.UNAUTHORIZED ? 'AI_API_KEY_REQUIRED' : 'INVALID_REQUEST';
      details = Array.isArray(rawMessage) ? rawMessage : null;
    }

    response.status(statusCode).json({
      statusCode,
      code,
      message,
      requestId,
      details,
    });
  }
}
