// 백엔드 API 공통 클라이언트 (fetch 래퍼)
// - 모든 요청은 /api 기준 (개발: Vite 프록시 → 8080, 배포: 같은 jar 에서 서빙)
// - JSON 자동 직렬화/파싱, 2xx 가 아니면 ApiError 를 던짐

const BASE_URL = '/api'

export class ApiError extends Error {
  readonly status: number // HTTP 상태 코드 (네트워크 오류는 0)
  readonly body: unknown

  constructor(status: number, message: string, body: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

type RequestOptions = Omit<RequestInit, 'body' | 'method' | 'headers'> & {
  method?: string
  body?: unknown
  headers?: Record<string, string>
}

async function parseBody(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) return null
  const type = response.headers.get('content-type') ?? ''
  return type.includes('application/json') ? JSON.parse(text) : text
}

export async function request<T>(path: string, { method = 'GET', body, headers = {}, ...options }: RequestOptions = {}): Promise<T> {
  const init: RequestInit = { method, ...options }
  const finalHeaders: Record<string, string> = { Accept: 'application/json', ...headers }
  if (body !== undefined) {
    finalHeaders['Content-Type'] = 'application/json'
    init.body = JSON.stringify(body)
  }
  init.headers = finalHeaders

  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, init)
  } catch (e) {
    throw new ApiError(0, `네트워크 오류: ${(e as Error).message}`, null)
  }

  const data = await parseBody(response)
  if (!response.ok) {
    throw new ApiError(response.status, `API 오류 (${response.status}) ${method} ${path}`, data)
  }
  return data as T
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>(path, { ...options, method: 'POST', body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>(path, { ...options, method: 'PUT', body }),
  delete: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: 'DELETE' }),
}
