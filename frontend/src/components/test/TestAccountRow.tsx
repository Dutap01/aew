// 응시 하나의 레벨테스트 계정: 아이디(복사) + 사용 기한 + 다시 발급. 레벨테스트 결과·접수 상세에서 쓴다.
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, Copy, LoaderCircle, RotateCcw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { reissueTestAccount } from '@/api/attempts'
import { errorMessage } from '@/api/errors'
import { CredentialsPanel } from '@/components/student/CredentialsPanel'
import { Dialog } from '@/components/ui/Dialog'
import type { AttemptIssuedResponse, AttemptSummary } from '@/types/test'
import { cn } from '@/utils/cn'
import { formatDateTime } from '@/utils/format'

/** 1분마다 다시 그려 "사용 중 / 끝남" 이 시간에 맞게 바뀌게 */
function useNow(): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(id)
  }, [])
  return now
}

export function TestAccountRow({ a }: { a: AttemptSummary }) {
  const queryClient = useQueryClient()
  const now = useNow()
  const [copied, setCopied] = useState(false)
  const [issued, setIssued] = useState<AttemptIssuedResponse | null>(null)
  const finished = a.status === 'submitted' || a.status === 'graded'
  const reissue = useMutation({
    mutationFn: () => reissueTestAccount(a.id),
    onSuccess: (res) => {
      setIssued(res)
      queryClient.invalidateQueries({ queryKey: ['attempt', a.id] })
      queryClient.invalidateQueries({ queryKey: ['attempts'] })
      queryClient.invalidateQueries({ queryKey: ['inquiry'] })
      queryClient.invalidateQueries({ queryKey: ['test-accounts'] })
    },
  })

  const expired = !a.takerExpiresAt || new Date(a.takerExpiresAt).getTime() <= now

  async function copy() {
    if (!a.takerLoginId) return
    try {
      await navigator.clipboard.writeText(a.takerLoginId)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {a.takerLoginId ? (
        <>
          <span className="font-mono text-sm font-bold text-ink">{a.takerLoginId}</span>
          <button type="button" onClick={copy} aria-label="아이디 복사" title="아이디 복사"
            className="flex size-7 items-center justify-center rounded-lg text-muted hover:bg-track hover:text-ink">
            {copied ? <Check className="size-3.5 text-brand-700" /> : <Copy className="size-3.5" />}
          </button>
          <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums',
            expired ? 'bg-track text-muted' : 'bg-brand-50 text-brand-800')}>
            {expired ? '사용 끝남' : `${formatDateTime(a.takerExpiresAt!)}까지`}
          </span>
        </>
      ) : (
        <span className="text-xs text-muted">계정 없음</span>
      )}
      {!finished && (
        <button type="button" disabled={reissue.isPending}
          onClick={() => window.confirm('레벨테스트 계정을 다시 발급할까요? 새 비밀번호가 만들어지고 사용 시간이 지금부터 다시 시작됩니다.') && reissue.mutate()}
          className="inline-flex h-7 items-center gap-1 rounded-lg bg-track px-2 text-xs font-semibold text-ink hover:bg-brand-50 hover:text-brand-800 disabled:opacity-50">
          {reissue.isPending ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden /> : <RotateCcw className="size-3.5" aria-hidden />}
          다시 발급
        </button>
      )}
      {reissue.isError && <span role="alert" className="basis-full text-[11px] text-alert">{errorMessage(reissue.error)}</span>}
      <Dialog open={issued !== null} onClose={() => setIssued(null)} title={`${a.studentName} 레벨테스트 계정`}>
        {issued && (
          <div className="space-y-4">
            <CredentialsPanel loginId={issued.loginId} password={issued.password} expiresAt={issued.expiresAt} />
            <div className="flex justify-end">
              <button type="button" onClick={() => setIssued(null)} className="h-10 rounded-xl bg-brand px-5 text-sm font-bold text-white hover:bg-brand-700">확인</button>
            </div>
          </div>
        )}
      </Dialog>
    </span>
  )
}
