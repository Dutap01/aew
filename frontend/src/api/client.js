// 백엔드 API 공통 클라이언트 (fetch 래퍼)
// - 모든 요청은 /api 기준 (개발: Vite 프록시 → 8080, 배포: 같은 jar 에서 서빙)
// - JSON 자동 직렬화/파싱, 2xx 가 아니면 ApiError 를 던짐

const BASE_URL = '/api'

export class ApiError extends Error {
  constructor(status, message, body) {
    super(message)
    this.name = 'ApiError'
    this.status = status // HTTP 상태 코드 (네트워크 오류는 0)
    this.body = body
  }
}

async function parseBody(response) {
  const text = await response.text()
  if (!text) return null
  const type = response.headers.get('content-type') || ''
  return type.includes('application/json') ? JSON.parse(text) : text
}

export async function request(path, { method = 'GET', body, headers = {}, ...options } = {}) {
  const init = {
    method,
    headers: { Accept: 'application/json', ...headers },
    ...options,
  }
  if (body !== undefined) {
    init.headers['Content-Type'] = 'application/json'
    init.body = JSON.stringify(body)
  }

  let response
  try {
    response = await fetch(`${BASE_URL}${path}`, init)
  } catch (e) {
    throw new ApiError(0, `네트워크 오류: ${e.message}`, null)
  }

  const data = await parseBody(response)
  if (!response.ok) {
    throw new ApiError(response.status, `API 오류 (${response.status}) ${method} ${path}`, data)
  }
  return data
}

export const api = {
  get: (path, options) => request(path, { ...options, method: 'GET' }),
  post: (path, body, options) => request(path, { ...options, method: 'POST', body }),
  put: (path, body, options) => request(path, { ...options, method: 'PUT', body }),
  delete: (path, options) => request(path, { ...options, method: 'DELETE' }),
}
