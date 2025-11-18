/**
 * Custom error types used by the Dracula library.
 */

export type DraculaErrorCode =
  | 'E_VALIDATION'
  | 'E_CONNECTION'
  | 'E_CONFIG'
  | 'E_NOT_FOUND'
  | 'E_INTERNAL'

export class DraculaError extends Error {
  public readonly code: DraculaErrorCode
  public readonly cause?: unknown

  constructor(code: DraculaErrorCode, message: string, cause?: unknown) {
    super(message)
    this.name = new.target.name
    this.code = code
    this.cause = cause
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, new.target)
    }
  }
}

export class ValidationError extends DraculaError {
  constructor(message: string, cause?: unknown) {
    super('E_VALIDATION', message, cause)
  }
}

export class ConnectionError extends DraculaError {
  constructor(message: string, cause?: unknown) {
    super('E_CONNECTION', message, cause)
  }
}

export class ConfigError extends DraculaError {
  constructor(message: string, cause?: unknown) {
    super('E_CONFIG', message, cause)
  }
}

export class NotFoundError extends DraculaError {
  constructor(message: string, cause?: unknown) {
    super('E_NOT_FOUND', message, cause)
  }
}

export class InternalError extends DraculaError {
  constructor(message: string, cause?: unknown) {
    super('E_INTERNAL', message, cause)
  }
}
