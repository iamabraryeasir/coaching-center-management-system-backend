export interface ApiErrorDetail {
  path?: string;
  message: string;
}

export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly errors?: ApiErrorDetail[];

  constructor(statusCode: number, message: string, errors?: ApiErrorDetail[], stack = '') {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.errors = errors;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  static badRequest(message = 'Bad request', errors?: ApiErrorDetail[]): ApiError {
    return new ApiError(400, message, errors);
  }

  static unauthorized(message = 'Unauthorized access', errors?: ApiErrorDetail[]): ApiError {
    return new ApiError(401, message, errors);
  }

  static forbidden(message = 'Access forbidden', errors?: ApiErrorDetail[]): ApiError {
    return new ApiError(403, message, errors);
  }

  static notFound(message = 'Resource not found', errors?: ApiErrorDetail[]): ApiError {
    return new ApiError(404, message, errors);
  }

  static conflict(
    message = 'Conflict with existing resource',
    errors?: ApiErrorDetail[],
  ): ApiError {
    return new ApiError(409, message, errors);
  }

  static unprocessable(
    message = 'Validation constraint failed',
    errors?: ApiErrorDetail[],
  ): ApiError {
    return new ApiError(422, message, errors);
  }

  static internal(message = 'Internal server error'): ApiError {
    return new ApiError(500, message);
  }
}
