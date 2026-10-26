export interface ApiErrorEnvelope {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(
    message: string,
    options: { status: number; code: string; details?: unknown; cause?: unknown },
  ) {
    super(message, { cause: options.cause });
    this.name = 'ApiError';
    this.status = options.status;
    this.code = options.code;
    this.details = options.details;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function errorMessage(error: unknown): string {
  if (isApiError(error)) {
    return error.message;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Something went wrong. Please try again.';
}

export async function apiErrorFromResponse(response: Response): Promise<ApiError> {
  let body: ApiErrorEnvelope | null = null;

  try {
    body = (await response.json()) as ApiErrorEnvelope;
  } catch {
    // The response body is not JSON; use the status-based fallback below.
  }

  const fallbackMessage =
    response.status === 429
      ? 'Too many requests. Please wait a moment and try again.'
      : `Request failed with status ${response.status}.`;

  return new ApiError(body?.error?.message ?? fallbackMessage, {
    status: response.status,
    code: body?.error?.code ?? 'http_error',
    details: body?.error?.details,
  });
}
