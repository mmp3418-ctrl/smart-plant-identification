export type ServiceErrorCode =
  | 'MISSING_API_KEY'
  | 'MISSING_SUPABASE'
  | 'INVALID_FILE'
  | 'FILE_TOO_LARGE'
  | 'NETWORK'
  | 'API_ERROR'
  | 'NO_RESULTS'
  | 'NOT_FOUND'
  | 'UNKNOWN'

export class ServiceError extends Error {
  readonly code: ServiceErrorCode

  constructor(message: string, code: ServiceErrorCode) {
    super(message)
    this.name = 'ServiceError'
    this.code = code
  }
}

export function isServiceError(error: unknown): error is ServiceError {
  return error instanceof ServiceError
}
