// 백엔드 API 공통 클라이언트 (fetch 래퍼)
// - 모든 요청은 /api 기준 (개발: Vite 프록시 → 8080, 배포: 같은 jar 에서 서빙)
// - JSON 자동 직렬화/파싱, 2xx 가 아니면 ApiError 를 던짐
// - 세션 쿠키 로그인. GET 이 아닌 요청에는 XSRF-TOKEN 쿠키 값을 X-XSRF-TOKEN 헤더로 보낸다 (Spring Security CSRF)
// - 응답 타입은 schema.d.ts (npm run gen:api 로 백엔드 OpenAPI 명세에서 생성)

const BASE_URL = '/api'
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

function csrfToken(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

/** 로그인 후 요청이 401 이면(세션 만료) 호출할 함수. 서버가 이유(message)를 주면 함께 넘긴다. authStore 가 등록한다 */
let onUnauthorized: ((message: string | null) => void) | null = null
export function setUnauthorizedHandler(handler: (message: string | null) => void) {
  onUnauthorized = handler
}

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
  /** 401 이어도 세션 만료 처리(onUnauthorized)를 하지 않는다 (로그인·로그인 확인 요청) */
  skipUnauthorizedHandler?: boolean
}

async function parseBody(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) return null
  const type = response.headers.get('content-type') ?? ''
  return type.includes('application/json') ? JSON.parse(text) : text
}

export async function request<T>(
  path: string,
  { method = 'GET', body, headers = {}, skipUnauthorizedHandler, ...options }: RequestOptions = {},
): Promise<T> {
  const init: RequestInit = { method, credentials: 'same-origin', ...options }
  const finalHeaders: Record<string, string> = { Accept: 'application/json', ...headers }
  if (body instanceof URLSearchParams) {
    init.body = body // form 전송 (로그인)
  } else if (body !== undefined) {
    finalHeaders['Content-Type'] = 'application/json'
    init.body = JSON.stringify(body)
  }
  if (!SAFE_METHODS.has(method)) {
    const token = csrfToken()
    if (token) finalHeaders['X-XSRF-TOKEN'] = token
  }
  init.headers = finalHeaders

  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, init)
  } catch (e) {
    throw new ApiError(0, `네트워크 오류: ${(e as Error).message}`, null)
  }

  const data = await parseBody(response)
  if (response.status === 401 && !skipUnauthorizedHandler) {
    const message = data && typeof data === 'object' && 'message' in data && typeof data.message === 'string' ? data.message : null
    onUnauthorized?.(message)
  }
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
  /** application/x-www-form-urlencoded POST (Spring Security 로그인) */
  postForm: <T>(path: string, form: Record<string, string>, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'POST', body: new URLSearchParams(form) }),
}

/** 쿼리스트링 만들기: 빈 값(undefined, null, '')은 뺀다 */
export function toQuery(params: Record<string, string | number | null | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value))
  }
  const text = search.toString()
  return text ? `?${text}` : ''
}
