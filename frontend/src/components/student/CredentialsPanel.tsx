// 로그인 정보 표시 (발급·재발급 직후). 비밀번호는 지금만 볼 수 있다.
// expiresAt 이 있으면 레벨테스트 계정 (사용 기한 표시)
import { Copy, KeyRound, Timer } from 'lucide-react'
import { useState } from 'react'
import { formatDateTime } from '@/utils/format'

interface Props {
  loginId: string
  password: string | null
  expiresAt?: string | null
}

export function CredentialsPanel({ loginId, password, expiresAt }: Props) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(`아이디 ${loginId}${password ? ` / 비밀번호 ${password}` : ''}`)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-navy px-4 py-4 text-white">
        <div className="mb-2 flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-xs font-semibold opacity-80">
            <KeyRound className="size-3.5" aria-hidden /> {expiresAt ? '레벨테스트 계정' : '학생 로그인 정보'}
          </p>
          <button type="button" onClick={copy} className="inline-flex h-7 items-center gap-1 rounded-lg bg-white/10 px-2 text-xs font-semibold hover:bg-white/20">
            <Copy className="size-3.5" aria-hidden /> {copied ? '복사됨' : '복사'}
          </button>
        </div>
        <dl className="grid grid-cols-[4.5rem_1fr] gap-y-1.5 text-sm">
          <dt className="opacity-70">아이디</dt>
          <dd className="font-mono text-lg font-bold tracking-wide">{loginId}</dd>
          <dt className="opacity-70">비밀번호</dt>
          <dd className="font-mono text-lg font-bold tracking-[0.2em]">
            {password ?? <span className="text-sm font-normal tracking-normal opacity-80">기존 비밀번호 그대로</span>}
          </dd>
        </dl>
        {expiresAt && (
          <p className="mt-3 flex items-center gap-1.5 border-t border-white/15 pt-2.5 text-xs tabular-nums">
            <Timer className="size-3.5" aria-hidden /> <b>{formatDateTime(expiresAt)}</b>까지 로그인할 수 있습니다 (응시를 시작하면 시험이 끝날 때까지)
          </p>
        )}
      </div>
      {password && (
        <p className="rounded-xl bg-wait/15 px-3 py-2 text-xs text-[#a16207]">
          비밀번호는 지금만 보입니다. 창을 닫기 전에 학생에게 알려주세요.{' '}
          {expiresAt ? '잊어버리거나 시간이 지나면 \'다시 발급\'을 누르세요.' : '잊어버리면 \'비밀번호 재발급\'으로 새로 만들 수 있습니다.'}
        </p>
      )}
    </div>
  )
}
