import { ApiError } from './client'

/** 서버 오류 응답 {"message", "fieldErrors"} 에서 사용자에게 보여줄 문장 */
export function errorMessage(error: unknown, fallback = '처리 중 오류가 발생했습니다. 잠시 후 다시 시도하세요.'): string {
  if (error instanceof ApiError) {
    const body = error.body as { message?: unknown } | null
    if (body && typeof body.message === 'string') return body.message
    if (error.status === 0) return '서버에 연결할 수 없습니다. 인터넷 연결을 확인하세요.'
  }
  return fallback
}

/** 입력칸별 오류 (400 응답의 fieldErrors) */
export function fieldErrors(error: unknown): Record<string, string> {
  if (error instanceof ApiError && error.status === 400) {
    const body = error.body as { fieldErrors?: Record<string, string> } | null
    return body?.fieldErrors ?? {}
  }
  return {}
}
