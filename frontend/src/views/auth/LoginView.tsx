// 로그인 (운영자·학생 공용). 운영자는 아이디, 학생은 학생 코드(S-0001)로 로그인한다.
import { Eye, EyeOff, LoaderCircle, LogIn } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { type FormEvent, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { ApiError } from '@/api/client'
import { useAuthStore } from '@/stores/authStore'
import { cardEnter } from '@/utils/motion'
import type { Role } from '@/types/auth'
import { homePathOf, ROLE_LABEL } from '@/utils/role'

/** 개발 DB 샘플 계정 (backend DevDataSeeder, 개발 모드 화면에만 표시) */
const DEV_PASSWORD = '1234'
const DEV_ACCOUNTS: { loginId: string; role: Role }[] = [
  { loginId: 'owner', role: 'owner' },
  { loginId: 'counselor', role: 'counselor' },
  { loginId: 'teacher', role: 'teacher' },
  { loginId: 'S-0001', role: 'student' },
]

const INPUT =
  'h-11 w-full rounded-xl border border-line bg-white px-3.5 text-sm text-ink outline-none transition-colors placeholder:text-muted/70 focus:border-brand focus:ring-2 focus:ring-brand/20'

/** 로그인 후 돌아갈 경로. 외부 주소로 튀지 않도록 "/" 로 시작하는 내부 경로만 허용 */
function safeNext(next: string | null): string | null {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : null
}

export function LoginView() {
  const login = useAuthStore((s) => s.login)
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const reduced = useReducedMotion()

  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!loginId.trim() || !password) {
      setError('아이디와 비밀번호를 입력하세요.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const user = await login({ loginId: loginId.trim(), password })
      navigate(safeNext(params.get('next')) ?? homePathOf(user.role), { replace: true })
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 401
          ? (serverMessage(err.body) ?? '아이디 또는 비밀번호가 올바르지 않습니다.')
          : '로그인 중 오류가 발생했습니다. 잠시 후 다시 시도하세요.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-brand-900 px-4 py-10">
      <motion.div
        variants={cardEnter}
        initial={reduced ? false : 'hidden'}
        animate="show"
        className="w-full max-w-sm rounded-panel bg-white p-7 shadow-card-hover sm:p-8"
      >
        <div className="mb-7 flex items-center gap-2.5">
          <span className="flex size-10 items-center justify-center rounded-full bg-brand text-white">
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2.4} aria-hidden>
              <path d="M4 18 L9 6 L14 18 M6 13 H12 M15 6 V18 H20" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <div>
            <h1 className="text-lg font-extrabold leading-tight tracking-tight text-ink">LMS 로그인</h1>
            <p className="text-xs text-muted">운영자는 아이디, 학생은 학생 코드로 로그인하세요</p>
          </div>
        </div>

        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <div>
            <label htmlFor="loginId" className="mb-1.5 block text-xs font-semibold text-ink">
              아이디 / 학생 코드
            </label>
            <input
              id="loginId"
              name="loginId"
              autoComplete="username"
              autoCapitalize="off"
              spellCheck={false}
              placeholder="예: S-0001"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              className={INPUT}
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-xs font-semibold text-ink">
              비밀번호
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${INPUT} pr-11`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
                className="absolute top-1/2 right-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted hover:bg-track hover:text-ink"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          {error && (
            <p role="alert" className="rounded-xl bg-alert/10 px-3.5 py-2.5 text-xs font-medium text-alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand text-sm font-bold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <LogIn className="size-4" aria-hidden />}
            로그인
          </button>
        </form>

        <p className="mt-5 text-center text-[11px] text-muted">비밀번호를 잊었으면 학원에 문의하세요.</p>

        {import.meta.env.DEV && <DevAccounts onPick={(id) => { setLoginId(id); setPassword(DEV_PASSWORD) }} />}
      </motion.div>
    </div>
  )
}

function serverMessage(body: unknown): string | null {
  return body && typeof body === 'object' && 'message' in body && typeof body.message === 'string' ? body.message : null
}

/** 개발 모드에서만: 개발 DB 샘플 계정 */
function DevAccounts({ onPick }: { onPick: (loginId: string) => void }) {
  return (
    <div className="mt-6 border-t border-dashed border-line pt-4">
      <p className="mb-2 text-[11px] font-semibold text-muted">개발용 샘플 계정 (비밀번호 {DEV_PASSWORD})</p>
      <div className="flex flex-wrap gap-1.5">
        {DEV_ACCOUNTS.map((u) => (
          <button
            key={u.loginId}
            type="button"
            onClick={() => onPick(u.loginId)}
            className="rounded-full bg-track px-2.5 py-1 text-[11px] font-semibold text-ink hover:bg-brand-50 hover:text-brand-800"
          >
            {ROLE_LABEL[u.role]} · {u.loginId}
          </button>
        ))}
      </div>
    </div>
  )
}
