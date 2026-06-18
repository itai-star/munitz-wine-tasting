export type Result<T, E = AppError> =
  | { success: true; data: T }
  | { success: false; error: E }

export type AppError = {
  code: "NOT_FOUND" | "VALIDATION" | "DUPLICATE" | "SERVER_ERROR"
  message: string
}

export function ok<T>(data: T): Result<T> {
  return { success: true, data }
}

export function err<E = AppError>(error: E): Result<never, E> {
  return { success: false, error }
}
